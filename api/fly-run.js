import { flyPaintPath, flyRunManifest, normalizeFlySpec } from "./_flypaint.js";
import { json } from "./_http.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const spec = normalizeFlySpec(body);
  const run = flyRunManifest(spec);
  return json(res, 200, { ok: true, run, image: flyPaintPath(spec) });
}
