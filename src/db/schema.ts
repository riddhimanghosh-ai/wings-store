import {
  pgTable,
  uuid,
  text,
  integer,
  real,
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
  // OCR/STT stage — whatever turned the photo/audio into rawText.
  sourceModel: text("source_model"),
  sourceConfidence: real("source_confidence"),
  sourceMs: integer("source_ms"),
  // Structured-extraction stage — whatever turned rawText into items. Kept
  // separate from the source-stage fields above so a bug report like
  // "the last item's quantity is missing" can be attributed to the right
  // stage instead of guessed at.
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
  // Nullable: the extractor reports null when a quantity was clearly stated but
  // could not be resolved, so the order lands in needs_review instead of being
  // silently priced at a guessed 1.
  quantity: integer("quantity"),
  unit: text("unit").notNull().default("pcs"),
  matchConfidence: text("match_confidence"),
  unitPriceIdr: integer("unit_price_idr"),
  appliedDiscountPercent: integer("applied_discount_percent"),
});
