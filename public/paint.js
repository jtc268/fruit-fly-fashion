const laneButtons = document.querySelectorAll(".fly-lane");
const briefInput = document.querySelector("#fly-brief");
const intensity = document.querySelector("#fly-intensity");
const intensityOut = document.querySelector("#fly-intensity-out");
const runButton = document.querySelector("#run-fly");
const buyButton = document.querySelector("#buy-fly-paint");
const status = document.querySelector("#fly-status");
const caption = document.querySelector("#fly-caption");
const art = document.querySelector("#fly-paint-art");
const fallback = document.querySelector("#fly-paint-fallback");
const railSteps = [...document.querySelectorAll("#fly-rail li")];
const metrics = {
  id: document.querySelector("#fly-run-id"),
  pass: document.querySelector("#fly-pass"),
  spikes: document.querySelector("#fly-spikes"),
  active: document.querySelector("#fly-active")
};

const PASS_MS = 180;
const FALLBACK_LABEL = "RUN COMPLETE / PREVIEW UNAVAILABLE";
let lane = "saber";
let currentRun = null;
let busy = false;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const setStatus = (text, tone) => {
  status.textContent = text;
  status.classList.toggle("is-error", tone === "error");
  status.classList.toggle("is-done", tone === "done");
};

function resetRail() {
  railSteps.forEach((step) => step.classList.remove("is-live", "is-done"));
}

function showFallback(label) {
  art.hidden = true;
  art.removeAttribute("src");
  fallback.hidden = false;
  fallback.querySelector("span").textContent = label;
}

laneButtons.forEach((button) => {
  button.addEventListener("click", () => {
    lane = button.dataset.lane;
    laneButtons.forEach((other) => {
      const on = other === button;
      other.classList.toggle("is-active", on);
      other.setAttribute("aria-pressed", String(on));
    });
  });
});

intensity.addEventListener("input", () => {
  intensityOut.textContent = intensity.value;
});

async function animatePasses(run) {
  const passes = Array.isArray(run.passes) && run.passes.length ? run.passes : [];
  const total = Math.max(passes.length, railSteps.length);
  for (let index = 0; index < total; index += 1) {
    const pass = passes[index] || {};
    const step = railSteps[index];
    if (step) {
      step.classList.add("is-live");
      if (index > 0 && railSteps[index - 1]) railSteps[index - 1].classList.replace("is-live", "is-done");
    }
    metrics.pass.textContent = `${index + 1} / ${total}`;
    if (pass.spikes != null) metrics.spikes.textContent = Number(pass.spikes).toLocaleString();
    if (pass.active != null) metrics.active.textContent = Number(pass.active).toLocaleString();
    setStatus(`Pass ${pass.pass ?? index + 1} of ${total}: propagating…`);
    await wait(PASS_MS);
  }
  railSteps.forEach((step) => step.classList.replace("is-live", "is-done"));
}

runButton.addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  currentRun = null;
  runButton.disabled = true;
  buyButton.disabled = true;
  resetRail();
  showFallback("RUNNING…");
  metrics.pass.textContent = "0 / 6";
  metrics.spikes.textContent = "0";
  metrics.active.textContent = "0";
  metrics.id.textContent = "—";
  setStatus("Injecting brief into the connectome…");
  runButton.textContent = "THE FLY IS COOKING…";

  try {
    const response = await fetch("/api/fly-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lane, brief: briefInput.value.trim(), intensity: Number(intensity.value) })
    });
    const result = await response.json();
    if (!response.ok || !result.run) throw new Error(result.error || "The fly refused this brief");

    const run = result.run;
    metrics.id.textContent = run.runId || "—";
    await animatePasses(run);

    if (result.image) {
      art.src = result.image;
      art.alt = "Custom connectome artwork generated for this run";
      art.hidden = false;
      fallback.hidden = true;
    } else {
      showFallback(FALLBACK_LABEL);
    }

    currentRun = run;
    buyButton.disabled = false;
    caption.textContent = `Run ${run.runId || ""} · lane ${lane.toUpperCase()} · intensity ${intensity.value}. Deterministic: the same inputs reproduce this print.`;
    setStatus("Run complete. Your custom print is ready.", "done");
  } catch (error) {
    resetRail();
    showFallback("RUN FAILED");
    metrics.pass.textContent = "0 / 6";
    setStatus(error.message ? `${error.message}. Try again.` : "The run did not finish. Try again.", "error");
  } finally {
    busy = false;
    runButton.disabled = false;
    runButton.textContent = "LET THE FLY COOK";
  }
});

art.addEventListener("error", () => {
  if (art.hidden) return;
  showFallback(FALLBACK_LABEL);
});

buyButton.addEventListener("click", async () => {
  if (!currentRun || buyButton.disabled) return;
  const size = document.querySelector("input[name='fly-size']:checked")?.value || "M";
  buyButton.disabled = true;
  buyButton.querySelector("span:first-child").textContent = "OPENING SECURE CHECKOUT…";
  try {
    const response = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productKey: "fly-paint", size, quantity: 1, flySpec: currentRun.spec })
    });
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.error || "Checkout failed");
    window.location.assign(result.url);
  } catch (error) {
    setStatus(error.message || "Checkout is temporarily unavailable", "error");
    buyButton.disabled = false;
    buyButton.querySelector("span:first-child").textContent = "BUY THIS RUN · $49";
  }
});
