import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const [deleted] = await db.delete(orders).where(eq(orders.id, id)).returning();

  if (!deleted) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
