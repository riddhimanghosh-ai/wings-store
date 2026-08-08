import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { inArray } from "drizzle-orm";

export async function DELETE(req: Request) {
  const { ids } = await req.json().catch(() => ({ ids: undefined }));

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  const db = getDb();
  const deleted = await db.delete(orders).where(inArray(orders.id, ids)).returning();

  return NextResponse.json({ ok: true, deletedCount: deleted.length });
}
