import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { orders, orderItems, products, customers } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const db = getDb();
  const customerId = req.nextUrl.searchParams.get("customerId");

  const baseQuery = db
    .select({
      id: orders.id,
      sourceType: orders.sourceType,
      status: orders.status,
      deliveryStatus: orders.deliveryStatus,
      customerId: orders.customerId,
      customerName: orders.customerName,
      mediaUrl: orders.mediaUrl,
      rawText: orders.rawText,
      detectedLanguage: orders.detectedLanguage,
      orderDate: orders.orderDate,
      notes: orders.notes,
      extractionModel: orders.extractionModel,
      extractionTokens: orders.extractionTokens,
      extractionMs: orders.extractionMs,
      createdAt: orders.createdAt,
      storeName: customers.storeName,
      contactName: customers.contactName,
      customerPhone: customers.phone,
      customerCity: customers.city,
    })
    .from(orders)
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .orderBy(desc(orders.createdAt));

  const allOrders = customerId
    ? await baseQuery.where(eq(orders.customerId, customerId))
    : await baseQuery;

  const allItems = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      rawProductName: orderItems.rawProductName,
      quantity: orderItems.quantity,
      unit: orderItems.unit,
      matchConfidence: orderItems.matchConfidence,
      unitPriceIdr: orderItems.unitPriceIdr,
      appliedDiscountPercent: orderItems.appliedDiscountPercent,
      productName: products.name,
      productBrand: products.brand,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id));

  const itemsByOrder = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const existing = itemsByOrder.get(item.orderId) ?? [];
    existing.push(item);
    itemsByOrder.set(item.orderId, existing);
  }

  const result = allOrders.map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
  }));

  return NextResponse.json({ orders: result });
}
