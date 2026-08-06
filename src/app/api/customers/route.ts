import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { customers } from "@/db/schema";
import { asc } from "drizzle-orm";
import { z } from "zod";

export async function GET() {
  const db = getDb();
  const all = await db.select().from(customers).orderBy(asc(customers.storeName));
  return NextResponse.json({ customers: all });
}

const newCustomer = z.object({
  storeName: z.string().trim().min(1),
  contactName: z.string().trim().min(1),
  phone: z.string().trim().nullable().optional(),
  city: z.string().trim().nullable().optional(),
  address: z.string().trim().nullable().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = newCustomer.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const db = getDb();
  const [created] = await db
    .insert(customers)
    .values(parsed.data)
    .onConflictDoNothing()
    .returning();

  if (!created) {
    return NextResponse.json({ error: "A store with that name already exists" }, { status: 409 });
  }

  return NextResponse.json({ customer: created });
}
