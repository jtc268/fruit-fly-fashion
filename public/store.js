const products = {
  "raw-signal": { name: "RAW SIGNAL", proof: "https://youtu.be/z7UxYPu4K-0" },
  "saber-sync": { name: "SABER SYNC", proof: "https://youtu.be/PsyYCbb3VdU" },
  "hell-protocol": { name: "HELL PROTOCOL", proof: "https://youtu.be/SBirG2Dvjaw" },
  "market-maker": { name: "MARKET MAKER", proof: "https://youtu.be/bwokcFNjF0k" },
  "wall-contact": { name: "WALL CONTACT", proof: "https://youtu.be/DmzSKf962tI" },
  flytok: { name: "LOCAL MODEL", proof: "https://youtu.be/SeDXEfgg1gg" }
};

const dialog = document.querySelector("#product-dialog");
const form = document.querySelector("#buy-form");
const dialogImage = document.querySelector("#dialog-image");
const dialogName = document.querySelector("#dialog-name");
const dialogProof = document.querySelector("#dialog-proof");
const checkoutButton = form.querySelector(".checkout-button");
const toast = document.querySelector("#toast");
let activeProduct = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 3600);
}

function openProduct(key, pushState = true) {
  const product = products[key];
  if (!product) return;
  activeProduct = key;
  dialogName.textContent = product.name;
  dialogProof.href = product.proof;
  dialogImage.src = `/mockups/${key}.webp`;
  dialogImage.alt = `${product.name} black T-shirt`;
  if (pushState) history.replaceState(null, "", `?product=${key}`);
  dialog.showModal();
}

function closeProduct() {
  dialog.close();
  history.replaceState(null, "", `${location.pathname}#shop`);
}

document.querySelectorAll(".product-card").forEach((card) => {
  card.querySelector(".product-open").addEventListener("click", () => openProduct(card.dataset.product));
});
document.querySelector(".dialog-close").addEventListener("click", closeProduct);
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) closeProduct();
});
document.querySelector("#size-link").addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector("#size-guide").open = true;
  document.querySelector("#size-guide").scrollIntoView({ behavior: "smooth", block: "nearest" });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeProduct) return;
  const size = new FormData(form).get("size");
  checkoutButton.disabled = true;
  checkoutButton.querySelector("span:first-child").textContent = "OPENING SECURE CHECKOUT…";
  try {
    const response = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productKey: activeProduct, size, quantity: 1 })
    });
    const result = await response.json();
    if (!response.ok || !result.url) throw new Error(result.error || "Checkout failed");
    window.location.assign(result.url);
  } catch (error) {
    showToast(error.message || "Checkout is temporarily unavailable");
    checkoutButton.disabled = false;
    checkoutButton.querySelector("span:first-child").textContent = "BUY NOW";
  }
});

const observer = new IntersectionObserver(
  (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("visible")),
  { rootMargin: "0px 0px -6%", threshold: 0.08 }
);
document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));

const requestedProduct = new URLSearchParams(location.search).get("product");
if (requestedProduct && products[requestedProduct]) window.addEventListener("load", () => openProduct(requestedProduct, false));
