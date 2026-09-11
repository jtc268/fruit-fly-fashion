import Stripe from "stripe";
import { fulfillCheckout } from "./_fulfill.js";
import { rawBody } from "./_http.js";

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event;
  try {
    const payload = await rawBody(req);
    event = stripe.webhooks.constructEvent(payload, req.headers["stripe-signature"], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    console.error("webhook_signature_failed", error?.type || error?.name || "error");
    return res.status(400).send("Invalid signature");
  }
  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await fulfillCheckout(stripe, event.data.object.id);
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("fulfillment_failed", error?.status || error?.name || "error");
    return res.status(500).json({ received: false });
  }
}
