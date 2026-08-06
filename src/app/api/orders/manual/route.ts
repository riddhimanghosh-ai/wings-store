import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, products } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { z } from "zod";

const manualOrderInput = z.object({
  customerId: z.string().uuid().nullable().optional(),
  customerName: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = manualOrderInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const db = getDb();
  const productIds = parsed.data.items.map((i) => i.productId);
  const catalogRows = await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds));
  const catalogById = new Map(catalogRows.map((p) => [p.id, p]));

  const lines = parsed.data.items.map((item) => {
    const product = catalogById.get(item.productId);
    if (!product) throw new Error(`Unknown product ${item.productId}`);

    const discountApplies =
      product.discountMinQty != null &&
      product.discountPercent != null &&
      item.quantity >= product.discountMinQty;

    const unitPriceIdr = discountApplies
      ? Math.round(product.priceIdr * (1 - product.discountPercent! / 100))
      : product.priceIdr;

    return {
      product,
      quantity: item.quantity,
      unitPriceIdr,
      appliedDiscountPercent: discountApplies ? product.discountPercent : null,
    };
  });

  const rawText = lines
    .map((l) => `${l.quantity} ${l.product.unit} ${l.product.name}`)
    .join("\n");

  const [order] = await db
    .insert(orders)
    .values({
      sourceType: "manual",
      status: "confirmed",
      customerId: parsed.data.customerId ?? null,
      customerName: parsed.data.customerName ?? null,
      rawText,
      notes: parsed.data.notes ?? null,
    })
    .returning();

  for (const line of lines) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: line.product.id,
      rawProductName: line.product.name,
      quantity: line.quantity,
      unit: line.product.unit,
      matchConfidence: "matched",
      unitPriceIdr: line.unitPriceIdr,
      appliedDiscountPercent: line.appliedDiscountPercent,
    });
  }

  return NextResponse.json({ orderId: order.id });
}
