import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { asc } from "drizzle-orm";
import { z } from "zod";

const productInput = z.object({
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

export async function GET() {
  const db = getDb();
  const all = await db.select().from(products).orderBy(asc(products.name));
  return NextResponse.json({ products: all });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = productInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const db = getDb();
  const [created] = await db.insert(products).values(parsed.data).returning();
  return NextResponse.json({ product: created });
}
