import Stripe from "stripe";
import { resolveLineItem, SITE_NAME } from "./_catalog.js";
import { flyPaintPath, normalizeFlySpec, signFlySpec } from "./_flypaint.js";
import { json, siteUrl } from "./_http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }
  if (!process.env.PRINTIFY_API_TOKEN || !process.env.PRINTIFY_SHOP_ID) {
    return json(res, 503, { error: "Drop is syncing. Try again in a minute." });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const { product, size, quantity, variantId } = resolveLineItem(body.productKey, body.size, body.quantity);
    const origin = siteUrl(req);
    const isCustom = product.kind === "custom-shirt";
    const flySpec = isCustom ? normalizeFlySpec(body.flySpec || {}) : null;
    const flySignature = flySpec ? signFlySpec(flySpec, process.env.CRON_SECRET) : null;
    const designPath = flySpec
      ? flyPaintPath(flySpec, { print: true, signature: flySignature })
      : `/designs/${product.design}`;
    const previewPath = flySpec ? flyPaintPath(flySpec) : `/mockups/${product.key}.webp`;
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        submit_type: "pay",
        allow_promotion_codes: true,
        automatic_tax: { enabled: true },
        billing_address_collection: "auto",
        shipping_address_collection: { allowed_countries: ["US"] },
        shipping_options: [
          {
            shipping_rate_data: {
              type: "fixed_amount",
              tax_behavior: "exclusive",
              fixed_amount: { amount: 0, currency: "usd" },
              display_name: "Free tracked US shipping",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 4 },
                maximum: { unit: "business_day", value: 10 }
              }
            }
          }
        ],
        customer_creation: "always",
        phone_number_collection: { enabled: false },
        line_items: [
          {
            quantity,
            price_data: {
              currency: "usd",
              unit_amount: product.price,
              tax_behavior: "exclusive",
              product_data: {
                name: `${product.name} / ${size}`,
                description: "Comfort Colors 1717 · heavyweight 100% ring-spun cotton · black",
                images: [`${origin}${previewPath}`],
                metadata: { store: SITE_NAME, product_key: product.key, size }
              }
            }
          }
        ],
        metadata: {
          store: SITE_NAME,
          product_key: product.key,
          product_name: product.name,
          product_kind: product.kind,
          design: designPath,
          size,
          quantity: String(quantity),
          variant_id: String(variantId),
          fulfillment_status: "pending",
          ...(flySpec ? {
            fly_lane: flySpec.lane,
            fly_brief: flySpec.brief,
            fly_seed: flySpec.seed,
            fly_intensity: String(flySpec.intensity)
          } : {})
        },
        payment_intent_data: {
          metadata: {
            store: SITE_NAME,
            product_key: product.key,
            size,
            quantity: String(quantity)
          }
        },
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/#shop`
      },
      { idempotencyKey: `checkout-${crypto.randomUUID()}` }
    );
    return json(res, 200, { url: session.url });
  } catch (error) {
    console.error("checkout_create_failed", error?.type || error?.name || "error");
    return json(res, 400, { error: error?.message || "Checkout is temporarily unavailable" });
  }
}
