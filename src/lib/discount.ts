export type DiscountableProduct = {
  discountMinQty: number | null;
  discountPercent: number | null;
};

export function discountInfo(product: DiscountableProduct, qty: number) {
  if (product.discountMinQty == null || product.discountPercent == null) return null;

  if (qty >= product.discountMinQty) {
    return { eligible: true as const, percent: product.discountPercent, minQty: product.discountMinQty };
  }

  return {
    eligible: false as const,
    percent: product.discountPercent,
    minQty: product.discountMinQty,
    remaining: product.discountMinQty - qty,
  };
}
