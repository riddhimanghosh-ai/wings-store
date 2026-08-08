import { getDb } from "@/db";
import { orders, orderItems, products, type OrderSourceType } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { OrderExtraction } from "./order-schema";

type ExtractionWithMeta = OrderExtraction & {
  sourceModel?: string | null;
  sourceConfidence?: number | null;
  sourceMs?: number | null;
  extractionModel?: string | null;
  extractionTokens?: number | null;
  extractionMs?: number | null;
};

export async function persistOrder(
  extraction: ExtractionWithMeta,
  sourceType: OrderSourceType,
  mediaUrl: string,
  customer?: { customerId?: string | null; customerName?: string | null }
) {
  const db = getDb();

  const [order] = await db
    .insert(orders)
    .values({
      sourceType,
      mediaUrl,
      customerId: customer?.customerId ?? null,
      customerName: customer?.customerName ?? null,
      rawText: extraction.rawText,
      detectedLanguage: extraction.language,
      orderDate: extraction.orderDate,
      notes: extraction.notes,
      sourceModel: extraction.sourceModel ?? null,
      sourceConfidence: extraction.sourceConfidence ?? null,
      sourceMs: extraction.sourceMs ?? null,
      extractionModel: extraction.extractionModel ?? null,
      extractionTokens: extraction.extractionTokens ?? null,
      extractionMs: extraction.extractionMs ?? null,
      status: extraction.items.some((item) => !item.matchedProductName)
        ? "needs_review"
        : "parsed",
    })
    .returning();

  for (const item of extraction.items) {
    let productId: string | null = null;
    let unitPriceIdr: number | null = null;
    let appliedDiscountPercent: number | null = null;

    if (item.matchedProductName) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.name, item.matchedProductName));

      if (product) {
        productId = product.id;
        const qty = Math.round(item.quantity);
        const discountApplies =
          product.discountMinQty != null &&
          product.discountPercent != null &&
          qty >= product.discountMinQty;
        unitPriceIdr = discountApplies
          ? Math.round(product.priceIdr * (1 - product.discountPercent! / 100))
          : product.priceIdr;
        appliedDiscountPercent = discountApplies ? product.discountPercent : null;
      }
    }

    await db.insert(orderItems).values({
      orderId: order.id,
      productId,
      rawProductName: item.rawProductName,
      quantity: Math.round(item.quantity),
      unit: item.unit ?? "pcs",
      matchConfidence: productId ? "matched" : "unmatched",
      unitPriceIdr,
      appliedDiscountPercent,
    });
  }

  return order;
}
