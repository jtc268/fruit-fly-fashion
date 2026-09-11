import { json } from "./_http.js";

export default async function handler(_req, res) {
  let printify = false;
  if (process.env.PRINTIFY_API_TOKEN && process.env.PRINTIFY_SHOP_ID) {
    try {
      const response = await fetch("https://api.printify.com/v1/shops.json", {
        headers: { Authorization: `Bearer ${process.env.PRINTIFY_API_TOKEN}` }
      });
      if (response.ok) {
        const shops = await response.json();
        printify = shops.some((shop) => String(shop.id) === String(process.env.PRINTIFY_SHOP_ID));
      }
    } catch {
      printify = false;
    }
  }

  return json(res, 200, {
    ok: true,
    stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    printify,
    reconciliation: Boolean(process.env.CRON_SECRET)
  });
}
