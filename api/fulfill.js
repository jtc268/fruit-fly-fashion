import Stripe from "stripe";
import { fulfillCheckout } from "./_fulfill.js";
import { json } from "./_http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (!/^cs_(test_|live_)/.test(body.sessionId || "")) return json(res, 400, { error: "Invalid order" });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const result = await fulfillCheckout(stripe, body.sessionId);
    return json(res, 200, { ok: true, status: result.status });
  } catch (error) {
    console.error("fulfillment_request_failed", error?.status || error?.name || "error");
    return json(res, 500, { ok: false });
  }
}

