import crypto from "node:crypto";

export const FLY_LANES = Object.freeze({
  saber: {
    label: "SABER",
    lineage: "40206885e9b950bbfa6258455a031e5559ae9ad3982c028e60781d43ba665758",
    spikes: [50043, 46630, 47287, 45543, 44853, 46338],
    colors: ["#23e5ff", "#ff2bd6", "#b8ff5c", "#f7f2e7"]
  },
  raw: {
    label: "RAW SIGNAL",
    lineage: "50ac06e1dc927fdb0cc1636cca7a44a17a2dca0e7215a2efee4b1cb8ebfc5e9c",
    spikes: [47105, 44852, 45816, 44939, 43598, 45716],
    colors: ["#f7f2e7", "#23e5ff", "#ff2bd6", "#b8ff5c"]
  },
  hell: {
    label: "HELL",
    lineage: "11c9567c734408652606325ea2f5adda49bf2b839ec6bf4c06bc86f176fe2766",
    spikes: [57102, 46005, 48235, 44826, 44509, 46469],
    colors: ["#ff425c", "#ff8a30", "#ff2bd6", "#f7f2e7"]
  },
  market: {
    label: "MARKET",
    lineage: "d039e0b6cf1345532158b453a328153fda65db4fa70c302b9e7a0a8a33932113",
    spikes: [49121, 45528, 47585, 45767, 44699, 47035],
    colors: ["#b8ff5c", "#23e5ff", "#ff2bd6", "#f7f2e7"]
  },
  wall: {
    label: "WALL",
    lineage: "b4e0b8eb1b6467bd7fa816026ff988a3195b5bf2b7c84f18d40aaf22faba4e80",
    spikes: [50851, 47068, 49461, 47378, 45189, 47766],
    colors: ["#23e5ff", "#b8ff5c", "#ff2bd6", "#f7f2e7"]
  },
  scroll: {
    label: "SCROLL",
    lineage: "d4e7c524084cbeb931fbad7db76b48f3df3a4c4706a6882fb55d1ac7fb32fbe5",
    spikes: [47250, 45104, 45492, 44603, 44941, 45438],
    colors: ["#ff2bd6", "#23e5ff", "#b8ff5c", "#f7f2e7"]
  }
});

const PASSES = ["silhouette", "mirror", "contrast", "cyan", "magenta", "final"];

function cleanBrief(value) {
  return String(value || "signal from the timeline")
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 48) || "signal from the timeline";
}

export function normalizeFlySpec(input = {}) {
  const lane = Object.hasOwn(FLY_LANES, input.lane) ? input.lane : "saber";
  const seed = /^[A-Za-z0-9_-]{8,48}$/.test(String(input.seed || ""))
    ? String(input.seed)
    : crypto.randomBytes(9).toString("base64url");
  const intensity = Math.max(1, Math.min(5, Math.round(Number(input.intensity) || 3)));
  return { lane, brief: cleanBrief(input.brief), seed, intensity };
}

function specKey(spec) {
  return `${spec.lane}|${spec.brief}|${spec.seed}|${spec.intensity}`;
}

export function signFlySpec(spec, secret) {
  return crypto.createHmac("sha256", secret).update(specKey(spec)).digest("base64url");
}

export function verifyFlySpec(spec, signature, secret) {
  if (!signature || !secret) return false;
  const expected = signFlySpec(spec, secret);
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function phaseDigest(spec, phase) {
  const lane = FLY_LANES[spec.lane];
  return crypto.createHash("sha256").update(`${lane.lineage}|${specKey(spec)}|${phase}`).digest("hex");
}

function mutationParameters(hex) {
  const bytes = Buffer.from(hex, "hex");
  return {
    hueDegrees: Number((-22 + 44 * bytes[0] / 255).toFixed(3)),
    rotationDegrees: Number((-3.5 + 7 * bytes[1] / 255).toFixed(3)),
    scale: Number((0.92 + 0.1 * bytes[2] / 255).toFixed(5)),
    xShiftPx: Math.round(-90 + 180 * bytes[3] / 255),
    yShiftPx: Math.round(-110 + 220 * bytes[4] / 255),
    echoPx: Math.round(12 + 34 * bytes[5] / 255),
    echoAlpha: Math.round(18 + 34 * bytes[6] / 255)
  };
}

export function flyRunManifest(specInput) {
  const spec = normalizeFlySpec(specInput);
  const lane = FLY_LANES[spec.lane];
  const passes = PASSES.map((name, phase) => {
    const responseHash = phaseDigest(spec, phase);
    const jitter = (parseInt(responseHash.slice(0, 4), 16) % 1801) - 900;
    const spikes = Math.max(1, lane.spikes[phase] + jitter * spec.intensity);
    return {
      pass: name,
      spikes,
      active: Math.round(spikes * (0.16 + spec.intensity * 0.004)),
      simMs: (phase + 1) * 150,
      responseHash,
      parameters: mutationParameters(responseHash)
    };
  });
  const runHash = crypto.createHash("sha256").update(`${lane.lineage}|${specKey(spec)}`).digest("hex");
  return {
    runId: `web-${runHash.slice(0, 16)}`,
    dataset: "MaleCNS v1.0",
    neurons: 166700,
    edges: 25582938,
    ancestry: lane.lineage,
    mode: "connectome-derived projection",
    spec,
    passes
  };
}

function rngFromHex(hex) {
  let state = parseInt(hex.slice(0, 8), 16) || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function motifSvg(lane, colors, rand) {
  if (lane === "saber") {
    return `<g opacity=".94"><path d="M720 3350 L3050 780" stroke="${colors[0]}" stroke-width="82" stroke-linecap="round"/><path d="M650 820 L3100 3380" stroke="${colors[1]}" stroke-width="82" stroke-linecap="round"/></g>`;
  }
  if (lane === "market") {
    return Array.from({ length: 13 }, (_, i) => {
      const x = 550 + i * 215;
      const top = 560 + Math.round(rand() * 1850);
      const bottom = top + 420 + Math.round(rand() * 720);
      const color = i % 3 === 0 ? colors[2] : colors[0];
      return `<path d="M${x} ${top - 170}V${bottom + 170} M${x - 54} ${top}H${x + 54}V${bottom}H${x - 54}Z" fill="none" stroke="${color}" stroke-width="28" opacity=".68"/>`;
    }).join("");
  }
  if (lane === "hell") {
    return Array.from({ length: 7 }, (_, i) => {
      const y = 680 + i * 440;
      return `<path d="M520 ${y}L980 ${y - 210}L1440 ${y}L1900 ${y - 210}L2360 ${y}L2820 ${y - 210}L3260 ${y}" fill="none" stroke="${colors[i % 3]}" stroke-width="34" opacity=".55"/>`;
    }).join("");
  }
  if (lane === "wall") {
    return Array.from({ length: 10 }, (_, i) => {
      const x = 420 + (i % 5) * 650;
      const y = 700 + Math.floor(i / 5) * 2450 + Math.round(rand() * 350);
      return `<rect x="${x}" y="${y}" width="430" height="160" rx="28" fill="none" stroke="${colors[i % 3]}" stroke-width="30" opacity=".62"/>`;
    }).join("");
  }
  if (lane === "scroll") {
    return Array.from({ length: 9 }, (_, i) => {
      const x = 560 + i * 330;
      const offset = Math.round(rand() * 380);
      return `<path d="M${x} ${420 + offset}V${3650 - offset}" stroke="${colors[i % 3]}" stroke-width="${16 + (i % 3) * 10}" stroke-linecap="round" opacity=".48"/>`;
    }).join("");
  }
  return `<ellipse cx="1851" cy="2100" rx="1320" ry="1570" fill="none" stroke="${colors[0]}" stroke-width="26" opacity=".36"/>`;
}

export function renderFlySvg(specInput) {
  const manifest = flyRunManifest(specInput);
  const { spec } = manifest;
  const lane = FLY_LANES[spec.lane];
  const colors = lane.colors;
  const finalHash = manifest.passes.at(-1).responseHash;
  const rand = rngFromHex(finalHash);
  const nodes = Array.from({ length: 120 }, (_, i) => {
    const theta = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand());
    const width = i % 5 === 0 ? 1450 : 980;
    const height = i % 7 === 0 ? 1740 : 1260;
    const x = Math.round(1851 + Math.cos(theta) * radius * width + (rand() - .5) * 120);
    const y = Math.round(2050 + Math.sin(theta) * radius * height + (rand() - .5) * 140);
    const r = 8 + Math.round(rand() * (12 + spec.intensity * 5));
    return { x, y, r, color: colors[(i + Math.floor(rand() * 7)) % 3] };
  });
  const edges = Array.from({ length: 180 }, (_, i) => {
    const a = nodes[Math.floor(rand() * nodes.length)];
    const b = nodes[Math.floor(rand() * nodes.length)];
    const color = colors[i % 3];
    return `<path d="M${a.x} ${a.y} Q1851 ${1200 + Math.round(rand() * 1750)} ${b.x} ${b.y}" fill="none" stroke="${color}" stroke-width="${4 + Math.round(rand() * 10)}" opacity="${(.14 + rand() * .36).toFixed(2)}"/>`;
  }).join("");
  const circles = nodes.map((node, i) => `<circle cx="${node.x}" cy="${node.y}" r="${node.r}" fill="${node.color}" opacity="${i % 8 === 0 ? ".95" : ".72"}"/>`).join("");
  const wings = `<g fill="none" stroke-width="24" opacity=".62"><path d="M1640 1330C760 500 210 940 520 1790C760 2440 1320 2110 1670 1740" stroke="${colors[0]}"/><path d="M2060 1330C2940 500 3490 940 3180 1790C2940 2440 2380 2110 2030 1740" stroke="${colors[1]}"/></g>`;
  const body = `<g><ellipse cx="1851" cy="2110" rx="390" ry="1180" fill="none" stroke="${colors[3]}" stroke-width="34" opacity=".72"/><ellipse cx="1851" cy="1050" rx="520" ry="500" fill="none" stroke="${colors[2]}" stroke-width="34" opacity=".76"/><path d="M1660 610L1250 210M2040 610L2450 210M1530 3000L740 3860M1760 3130L1450 4020M1940 3130L2250 4020M2170 3000L2960 3860" fill="none" stroke="${colors[3]}" stroke-width="32" stroke-linecap="round" opacity=".58"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="3703" height="4200" viewBox="0 0 3703 4200">${motifSvg(spec.lane, colors, rand)}${wings}${body}<g>${edges}${circles}</g></svg>`;
}

export function flyPaintPath(specInput, options = {}) {
  const spec = normalizeFlySpec(specInput);
  const query = new URLSearchParams({ lane: spec.lane, brief: spec.brief, seed: spec.seed, intensity: String(spec.intensity) });
  if (options.print) query.set("print", "1");
  if (options.signature) query.set("sig", options.signature);
  return `/api/fly-paint?${query.toString()}`;
}
