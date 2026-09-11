import sharp from "sharp";
import { normalizeFlySpec, renderFlySvg, verifyFlySpec } from "./_flypaint.js";
import { json } from "./_http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });
  const spec = normalizeFlySpec(req.query || {});
  const isPrint = String(req.query?.print || "") === "1";
  if (isPrint && !verifyFlySpec(spec, req.query?.sig, process.env.CRON_SECRET)) {
    return json(res, 403, { error: "Invalid print signature" });
  }
  const svg = renderFlySvg(spec);
  let png;
  if (isPrint) {
    const printCanvas = { width: 4494, height: 5097 };
    const trimmed = await sharp(Buffer.from(svg))
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 14 })
      .png()
      .toBuffer();
    const fitted = await sharp(trimmed)
      .resize({ width: 2860, height: 3150, fit: "inside", withoutEnlargement: false, kernel: "lanczos3" })
      .png({ compressionLevel: 9 })
      .toBuffer();
    const meta = await sharp(fitted).metadata();
    png = await sharp({ create: { ...printCanvas, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: fitted, top: 330, left: Math.round((printCanvas.width - meta.width) / 2) }])
      .withMetadata({ density: 300 })
      .png({ compressionLevel: 9 })
      .toBuffer();
  } else {
    png = await sharp(Buffer.from(svg)).resize(1200, 1361, { fit: "fill" }).png({ compressionLevel: 9 }).toBuffer();
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", isPrint ? "public, max-age=31536000, immutable" : "public, max-age=3600");
  return res.status(200).send(png);
}
