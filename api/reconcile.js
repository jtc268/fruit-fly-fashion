import Stripe from "stripe";
import { fulfillCheckout } from "./_fulfill.js";
import { SITE_NAME } from "./_catalog.js";
import { json } from "./_http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return json(res, 401, { error: "Unauthorized" });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sessions = await stripe.checkout.sessions.list({ limit: 100 });
  const pending = sessions.data.filter(
    (session) => session.payment_status === "paid" && session.metadata?.store === SITE_NAME && session.metadata?.fulfillment_status !== "submitted"
  );
  const results = [];
  for (const session of pending) {
    try {
      const result = await fulfillCheckout(stripe, session.id);
      results.push({ id: session.id, status: result.status });
    } catch (error) {
      console.error("reconcile_order_failed", error?.status || error?.name || "error");
      results.push({ id: session.id, status: "failed" });
    }
  }
  return json(res, 200, { ok: true, checked: sessions.data.length, reconciled: results.length });
}
