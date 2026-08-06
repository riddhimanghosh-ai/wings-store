import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, deliveryStatuses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const input = z.object({
  deliveryStatus: z.enum(deliveryStatuses),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(orders)
    .set({ deliveryStatus: parsed.data.deliveryStatus })
    .where(eq(orders.id, id))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order: updated });
}
