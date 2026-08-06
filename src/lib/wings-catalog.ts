export type WingsCategory = {
  slug: string;
  label: string;
  colorVar: string;
  icon: string;
  /** Maps onto the `category` column used by the shared product catalogue. */
  dbCategories: string[];
};

/** The ten tiles shown on the Wings Online beranda, in the live app's order. */
export const WINGS_CATEGORIES: WingsCategory[] = [
  { slug: "makanan", label: "Makanan", colorVar: "--cat-makanan", icon: "🍲", dbCategories: ["seasoning", "snacks"] },
  { slug: "minuman", label: "Minuman", colorVar: "--cat-minuman", icon: "🥤", dbCategories: ["beverages"] },
  { slug: "mie-instan", label: "Mie Instan", colorVar: "--cat-mie", icon: "🍜", dbCategories: ["noodles"] },
  { slug: "kopi-bubuk", label: "Kopi & Bubuk", colorVar: "--cat-kopi", icon: "☕", dbCategories: ["coffee", "powder_drinks"] },
  { slug: "deterjen", label: "Deterjen", colorVar: "--cat-deterjen", icon: "🧼", dbCategories: ["household"] },
  { slug: "perawatan-pakaian", label: "Perawatan Pakaian", colorVar: "--cat-pakaian", icon: "👕", dbCategories: ["household"] },
  { slug: "pembersih-rumah", label: "Pembersih Rumah", colorVar: "--cat-rumah", icon: "🏠", dbCategories: ["household"] },
  { slug: "perawatan-tubuh", label: "Perawatan Tubuh & Rambut", colorVar: "--cat-tubuh", icon: "🧴", dbCategories: ["personal_care"] },
  { slug: "pembersih-piring", label: "Pembersih Piring", colorVar: "--cat-piring", icon: "🍽️", dbCategories: ["household"] },
  { slug: "popok-bayi", label: "Popok & Perawatan Bayi", colorVar: "--cat-bayi", icon: "🍼", dbCategories: ["baby_care"] },
];

export function categoryBySlug(slug: string) {
  return WINGS_CATEGORIES.find((c) => c.slug === slug);
}

/**
 * The live app prices every line twice: once per box (dus) and once per piece
 * (eceran). Box price is an exact multiple of the piece price, e.g. a 150-pc
 * box of Soklin at Rp 345/pc lists as Rp 51.750.
 *
 * The shared catalogue only stores a single unit price, so pack size is derived
 * deterministically from the SKU for display fidelity — these are illustrative
 * pack sizes, not Wings' real packing data.
 */
const PACK_SIZE_BY_UNIT: Record<string, number[]> = {
  sachet: [100, 120, 150],
  bungkus: [24, 40],
  dus: [24, 40],
  cup: [12, 24],
  botol: [12, 24],
  pouch: [12, 24],
  bar: [48, 72],
  tube: [24, 48],
  kotak: [24, 36],
  pack: [6, 12],
  lusin: [5, 10],
  pcs: [12, 24],
};

function hashSku(sku: string) {
  let h = 0;
  for (let i = 0; i < sku.length; i += 1) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  return h;
}

export function packSizeFor(product: { sku: string; unit: string }) {
  const options = PACK_SIZE_BY_UNIT[product.unit] ?? [12, 24];
  return options[hashSku(product.sku) % options.length];
}

export function boxPriceFor(product: { sku: string; unit: string; priceIdr: number }) {
  return product.priceIdr * packSizeFor(product);
}

/** Formats like the live app: "Rp 51.750" (Indonesian dot separators, no decimals). */
export function rp(amount: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Math.round(amount))}`;
}

export const INDO_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function formatIndoDate(date: Date) {
  return `${date.getDate()} ${INDO_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

/** The live app defaults delivery to two days out. */
export function defaultDeliveryDate() {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d;
}
