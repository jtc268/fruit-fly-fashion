import { ALL_PRODUCTS, SITE_NAME } from "./_catalog.js";

async function printify(path, options = {}) {
  const response = await fetch(`https://api.printify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Printify ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function findOrder(externalId) {
  const result = await printify(`/shops/${process.env.PRINTIFY_SHOP_ID}/orders.json?limit=10`);
  return result.data?.find((order) => order.external_id === externalId) || null;
}

export async function fulfillCheckout(stripe, sessionId) {
  if (!process.env.PRINTIFY_API_TOKEN || !process.env.PRINTIFY_SHOP_ID) throw new Error("Fulfillment is not configured");
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["customer"] });
  if (session.payment_status !== "paid") return { status: "unpaid" };
  if (session.metadata?.fulfillment_status === "submitted") {
    return { status: "already_submitted", orderId: session.metadata.printify_order_id };
  }

  const product = ALL_PRODUCTS[session.metadata?.product_key];
  if (!product || session.metadata?.store !== SITE_NAME) throw new Error("Fulfillment product not found");
  const details = session.collected_information?.shipping_details || session.shipping_details;
  const address = details?.address;
  if (!details || !address) throw new Error("Fulfillment shipping address missing");

  let order = session.metadata?.printify_order_id
    ? await printify(`/shops/${process.env.PRINTIFY_SHOP_ID}/orders/${session.metadata.printify_order_id}.json`)
    : await findOrder(session.id);

  if (!order) {
    const site = process.env.SITE_URL.replace(/\/$/, "");
    const designUrl = product.kind === "custom-shirt"
      ? new URL(session.metadata.design, site).toString()
      : `${site}/designs/${product.design}`;
    const name = (details.name || "Customer").trim().split(/\s+/);
    order = await printify(`/shops/${process.env.PRINTIFY_SHOP_ID}/orders.json`, {
      method: "POST",
      body: JSON.stringify({
        external_id: session.id,
        label: `${product.name} / ${session.metadata.size}`,
        line_items: [
          {
            blueprint_id: product.blueprintId,
            print_provider_id: product.printProviderId,
            variant_id: Number(session.metadata.variant_id),
            print_areas: { front: designUrl },
            quantity: Number(session.metadata.quantity || 1),
            external_id: `${session.id}-${product.key}`
          }
        ],
        shipping_method: 1,
        is_printify_express: false,
        is_economy_shipping: false,
        send_shipping_notification: true,
        address_to: {
          first_name: name.shift() || "Customer",
          last_name: name.join(" ") || "Customer",
          email: session.customer_details?.email || session.customer?.email,
          phone: session.customer_details?.phone || "",
          country: address.country,
          region: address.state,
          address1: address.line1,
          address2: address.line2 || "",
          city: address.city,
          zip: address.postal_code
        }
      })
    });
  }

  await stripe.checkout.sessions.update(session.id, {
    metadata: { ...session.metadata, printify_order_id: String(order.id), fulfillment_status: "created" }
  });
  const submittedStatuses = new Set(["sending-to-production", "in-production", "fulfilled", "canceled"]);
  if (!submittedStatuses.has(order.status)) {
    await printify(`/shops/${process.env.PRINTIFY_SHOP_ID}/orders/${order.id}/send_to_production.json`, {
      method: "POST",
      body: "{}"
    });
  }
  await stripe.checkout.sessions.update(session.id, {
    metadata: { ...session.metadata, printify_order_id: String(order.id), fulfillment_status: "submitted" }
  });
  return { status: "submitted", orderId: String(order.id) };
}
