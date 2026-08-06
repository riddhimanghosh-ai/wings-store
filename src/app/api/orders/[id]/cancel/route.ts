import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

const CANCELLABLE = ["placed", "packed"];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (order.deliveryStatus === "cancelled") {
    return NextResponse.json({ error: "This order is already cancelled." }, { status: 409 });
  }

  if (!CANCELLABLE.includes(order.deliveryStatus)) {
    return NextResponse.json(
      {
        error:
          "This order can no longer be cancelled — it has already left the warehouse. Contact your Wings rep for help.",
      },
      { status: 409 }
    );
  }

  const [updated] = await db
    .update(orders)
    .set({ deliveryStatus: "cancelled" })
    .where(eq(orders.id, id))
    .returning();

  return NextResponse.json({ order: updated });
}
