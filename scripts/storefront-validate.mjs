import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { flyPaintPath, flyRunManifest, renderFlySvg, signFlySpec, verifyFlySpec } from "../api/_flypaint.js";

const root = path.resolve(import.meta.dirname, "..");
const required = [
  "public/index.html",
  "public/success.html",
  "public/styles.css",
  "public/store.js",
  "public/paint.js",
  "api/_flypaint.js",
  "api/fly-run.js",
  "api/fly-paint.js",
  "api/create-checkout.js",
  "api/fulfill.js",
  "api/reconcile.js",
  "api/stripe-webhook.js",
  ...["raw-signal", "saber-sync", "hell-protocol", "market-maker", "wall-contact", "flytok"].map((x) => `public/designs/${x}.png`)
];

for (const file of required) await fs.access(path.join(root, file));
for (const file of [
  "public/store.js",
  "public/paint.js",
  "api/_flypaint.js",
  "api/fly-run.js",
  "api/fly-paint.js",
  "api/create-checkout.js",
  "api/_fulfill.js",
  "api/fulfill.js",
  "api/reconcile.js",
  "api/stripe-webhook.js"
]) {
  execFileSync(process.execPath, ["--check", path.join(root, file)], { stdio: "inherit" });
}

const specimen = { lane: "saber", brief: "rainbow doom charts", seed: "flypaint01", intensity: 4 };
const run = flyRunManifest(specimen);
assert.equal(run.mode, "connectome-derived projection");
assert.equal(run.neurons, 166700);
assert.equal(run.edges, 25582938);
assert.equal(run.passes.length, 6);
assert.deepEqual(run, flyRunManifest(specimen), "fly runs must be replayable");
assert.ok(run.passes.every((pass) => pass.spikes > 0 && pass.responseHash.length === 64));

const secret = "validation-only-secret";
const signature = signFlySpec(run.spec, secret);
assert.ok(verifyFlySpec(run.spec, signature, secret));
assert.ok(!verifyFlySpec({ ...run.spec, intensity: 5 }, signature, secret));
assert.match(flyPaintPath(run.spec, { print: true, signature }), /print=1&sig=/);

const svg = renderFlySvg(run.spec);
assert.match(svg, /^<svg[^>]+width="3703"[^>]+height="4200"/);
assert.ok(!svg.includes(specimen.brief), "brief text must never be rendered on the shirt");
console.log("site files and serverless functions validated");
