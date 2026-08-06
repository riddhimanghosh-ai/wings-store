import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, products } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

const editInput = z.object({
  orderDate: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        productId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const body = await req.json();
  const parsed = editInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const db = getDb();

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const existingItems = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const existingById = new Map(existingItems.map((i) => [i.id, i]));

  const productIds = parsed.data.items.map((i) => i.productId);
  const catalogRows = await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds));
  const catalogById = new Map(catalogRows.map((p) => [p.id, p]));

  const isPriced = existingItems.some((i) => i.unitPriceIdr != null);
  const keepIds = new Set<string>();

  for (const item of parsed.data.items) {
    const product = catalogById.get(item.productId);
    if (!product) {
      return NextResponse.json({ error: `Unknown product ${item.productId}` }, { status: 400 });
    }

    const discountApplies =
      product.discountMinQty != null &&
      product.discountPercent != null &&
      item.quantity >= product.discountMinQty;
    const unitPriceIdr = isPriced
      ? discountApplies
        ? Math.round(product.priceIdr * (1 - product.discountPercent! / 100))
        : product.priceIdr
      : null;
    const appliedDiscountPercent = isPriced && discountApplies ? product.discountPercent : null;

    if (item.id && existingById.has(item.id)) {
      keepIds.add(item.id);
      await db
        .update(orderItems)
        .set({
          productId: product.id,
          rawProductName: product.name,
          quantity: item.quantity,
          unit: product.unit,
          matchConfidence: "matched",
          unitPriceIdr,
          appliedDiscountPercent,
        })
        .where(eq(orderItems.id, item.id));
    } else {
      const [created] = await db
        .insert(orderItems)
        .values({
          orderId,
          productId: product.id,
          rawProductName: product.name,
          quantity: item.quantity,
          unit: product.unit,
          matchConfidence: "matched",
          unitPriceIdr,
          appliedDiscountPercent,
        })
        .returning();
      keepIds.add(created.id);
    }
  }

  const idsToDelete = existingItems.filter((i) => !keepIds.has(i.id)).map((i) => i.id);
  if (idsToDelete.length > 0) {
    await db.delete(orderItems).where(inArray(orderItems.id, idsToDelete));
  }

  const [updatedOrder] = await db
    .update(orders)
    .set({
      orderDate: parsed.data.orderDate ?? null,
      notes: parsed.data.notes ?? null,
      status: "confirmed",
    })
    .where(eq(orders.id, orderId))
    .returning();

  return NextResponse.json({ order: updatedOrder });
}
