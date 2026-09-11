export const SITE_NAME = "166,700";
export const SHIRT_PRICE_CENTS = 3900;
export const CUSTOM_SHIRT_PRICE_CENTS = 4900;
export const DESK_PRICE_CENTS = 3900;

export const SHIRT_VARIANTS = Object.freeze({
  S: 73196,
  M: 73200,
  L: 73204,
  XL: 73208,
  "2XL": 73212,
  "3XL": 79114,
  "4XL": 101423
});

const shirts = {
  "raw-signal": {
    name: "RAW SIGNAL",
    subtitle: "MaleCNS v1.0, unmodified",
    design: "raw-signal.png"
  },
  "saber-sync": {
    name: "SABER SYNC",
    subtitle: "The fly brain can play Beat Saber",
    design: "saber-sync.png"
  },
  "hell-protocol": {
    name: "HELL PROTOCOL",
    subtitle: "The fly brain can play Doom",
    design: "hell-protocol.png"
  },
  "market-maker": {
    name: "MARKET MAKER",
    subtitle: "The fly brain can trade Bitcoin",
    design: "market-maker.png"
  },
  "wall-contact": {
    name: "WALL CONTACT",
    subtitle: "The fly brain can play Mario",
    design: "wall-contact.png"
  },
  flytok: {
    name: "LOCAL MODEL",
    subtitle: "",
    design: "flytok.png"
  }
};

export const PRODUCTS = Object.freeze(
  Object.fromEntries(
    Object.entries(shirts).map(([key, product]) => [
      key,
      {
        ...product,
        key,
        kind: "shirt",
        price: SHIRT_PRICE_CENTS,
        blueprintId: 706,
        printProviderId: 99
      }
    ])
  )
);

export const CUSTOM_PRODUCT = Object.freeze({
  key: "fly-paint",
  kind: "custom-shirt",
  name: "FLY PAINT / CUSTOM RUN",
  subtitle: "A live connectome-derived artifact",
  price: CUSTOM_SHIRT_PRICE_CENTS,
  blueprintId: 706,
  printProviderId: 99
});

export const ALL_PRODUCTS = Object.freeze({ ...PRODUCTS, [CUSTOM_PRODUCT.key]: CUSTOM_PRODUCT });

export function resolveLineItem(productKey, size, quantity) {
  const product = ALL_PRODUCTS[productKey];
  const safeQuantity = Number(quantity);
  if (!product) throw new Error("Unknown product");
  if (!Number.isInteger(safeQuantity) || safeQuantity < 1 || safeQuantity > 5) {
    throw new Error("Quantity must be between 1 and 5");
  }
  const variantId = SHIRT_VARIANTS[size];
  if (!variantId) throw new Error("Choose a valid size");
  return { product, size, quantity: safeQuantity, variantId };
}
