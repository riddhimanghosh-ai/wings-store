import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { asc } from "drizzle-orm";

export async function GET() {
  const db = getDb();
  const all = await db.select().from(products).orderBy(asc(products.name));
  return NextResponse.json({ products: all });
}
