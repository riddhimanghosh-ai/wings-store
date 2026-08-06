import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  jsonb,
} from "drizzle-orm/pg-core";

export const productCategories = [
  "noodles",
  "seasoning",
  "beverages",
  "coffee",
  "powder_drinks",
  "snacks",
  "household",
  "personal_care",
  "baby_care",
] as const;
export type ProductCategory = (typeof productCategories)[number];

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  sku: text("sku").notNull().unique(),
  name: text("name").notNull().unique(),
  brand: text("brand").notNull(),
  category: text("category").notNull().default("household"),
  unit: text("unit").notNull().default("pcs"),
  priceIdr: integer("price_idr").notNull().default(0),
  discountMinQty: integer("discount_min_qty"),
  discountPercent: integer("discount_percent"),
  aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderSourceType = ["voice", "photo", "manual"] as const;
export type OrderSourceType = (typeof orderSourceType)[number];

export const orderStatus = ["parsed", "needs_review", "confirmed"] as const;
export type OrderStatus = (typeof orderStatus)[number];

export const deliveryStatuses = [
  "placed",
  "packed",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type DeliveryStatus = (typeof deliveryStatuses)[number];

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  storeName: text("store_name").notNull().unique(),
  contactName: text("contact_name").notNull(),
  phone: text("phone"),
  city: text("city"),
  address: text("address"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  sourceType: text("source_type").notNull(),
  status: text("status").notNull().default("needs_review"),
  deliveryStatus: text("delivery_status").notNull().default("placed"),
  customerId: uuid("customer_id").references(() => customers.id),
  customerName: text("customer_name"),
  mediaUrl: text("media_url"),
  rawText: text("raw_text").notNull().default(""),
  detectedLanguage: text("detected_language"),
  orderDate: date("order_date"),
  notes: text("notes"),
  extractionModel: text("extraction_model"),
  extractionTokens: integer("extraction_tokens"),
  extractionMs: integer("extraction_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  rawProductName: text("raw_product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull().default("pcs"),
  matchConfidence: text("match_confidence"),
  unitPriceIdr: integer("unit_price_idr"),
  appliedDiscountPercent: integer("applied_discount_percent"),
});
