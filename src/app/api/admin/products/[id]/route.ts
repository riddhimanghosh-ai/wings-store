import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const productUpdate = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  unit: z.string().min(1),
  priceIdr: z.number().int().nonnegative(),
  discountMinQty: z.number().int().positive().nullable().optional(),
  discountPercent: z.number().int().min(1).max(100).nullable().optional(),
  aliases: z.array(z.string()).default([]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = productUpdate.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(products)
    .set(parsed.data)
    .where(eq(products.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  await db.delete(products).where(eq(products.id, id));
  return NextResponse.json({ ok: true });
}
