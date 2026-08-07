import { NextRequest, NextResponse } from "next/server";
import { generateText, tool, stepCountIs } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { getDb } from "@/db";
import { orders, orderItems, products } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatIdr } from "@/lib/format";

/**
 * The chatbot bills to its own Groq key so a burst of support chat cannot
 * exhaust the quota that order extraction depends on — a failed order costs
 * a sale, a failed chat reply does not. Falls back to the shared key when
 * GROQ_CHAT_API_KEY is unset, so the route keeps working either way.
 */
const chatGroq = createGroq({
  apiKey: process.env.GROQ_CHAT_API_KEY ?? process.env.GROQ_API_KEY,
});

const CHAT_MODEL = chatGroq("openai/gpt-oss-120b");

const DELIVERY_LABEL: Record<string, string> = {
  placed: "Order placed",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const SYSTEM_PROMPT = `You are the Wings Order Assistant support agent for Indonesian FMCG retailers and distributors ordering Wings products (Mie Sedaap, Ale-Ale, Kecap Sedaap, So Klin, Ciptadent, and more).

You help with three things:
1. Order status — use the lookupOrders tool. Report the delivery stage plainly and mention items and totals when useful.
2. Products, prices and discounts — use the searchProducts tool. Wings bulk discounts trigger at a minimum quantity, so always state both the percentage and the minimum quantity needed.
3. FAQs about how the app works. Facts you may state:
   - Orders can be placed three ways: recording a voice note, photographing a handwritten note, or browsing the catalogue manually.
   - Voice notes and handwritten notes work in English, Bahasa Indonesia, or a mix.
   - AI-extracted orders may land in "needs review" so the retailer can correct any mis-read item before approving.
   - Delivery stages, in order: Order placed → Packed → Out for delivery → Delivered.
   - Cancellation window: the customer can cancel while the order is at "Order placed" OR "Packed" — packed orders are STILL cancellable. It becomes NOT cancellable only once it moves to "Out for delivery" (or later). Never say cancellation is blocked at the packed stage — it isn't.

Rules:
- ALWAYS call a tool before answering anything about a specific order, product, price, or discount. Never guess prices, stock, or delivery stages.
- If a tool returns nothing, say so plainly and suggest what the user could try instead. Do not invent orders or products.
- Output is rendered as plain text, not markdown — never use **, *, #, or bullet dashes. Write plain sentences only. Keep answers short and practical, 1-4 sentences.
- All prices are Indonesian Rupiah. You cannot change, cancel, or place orders yourself; explain where in the app to do it instead.`;

const ID_MARKERS =
  /\b(yang|dan|saya|pesanan|ada|tidak|bagaimana|berapa|apakah|untuk|dengan|dari|sudah|bisa|mau|kirim|harga|diskon|belum|kapan|tolong|di ?mana|barang|toko)\b/i;

const EN_MARKERS =
  /\b(the|is|are|my|where|how|what|when|can|could|do|does|order|orders|price|prices|discount|discounts|cancel|delivery|show|any|there)\b/i;

/**
 * What the user actually typed wins. Only when a message is too short or
 * ambiguous to tell do we fall back to the UI language preference.
 */
function detectLanguage(text: string, uiLang: "id" | "en"): "id" | "en" {
  if (ID_MARKERS.test(text)) return "id";
  if (EN_MARKERS.test(text)) return "en";
  return uiLang;
}

export async function POST(req: NextRequest) {
  const { messages, customerId, lang } = await req.json();
  const uiLang: "id" | "en" = lang === "en" ? "en" : "id";

  if (!Array.isArray(messages)) {
    return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
  }

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
  const replyLanguage = detectLanguage(
    typeof lastUserMessage?.content === "string" ? lastUserMessage.content : "",
    uiLang
  );
  const languageDirective =
    replyLanguage === "id"
      ? "\n\nCRITICAL: Write your entire reply in Bahasa Indonesia."
      : "\n\nCRITICAL: Write your entire reply in English only. Do NOT reply in Indonesian, even though product names and units are Indonesian words.";

  const db = getDb();

  const lookupOrders = tool({
    description:
      "Look up the current customer's recent orders, including delivery stage, items and totals. Use for any 'where is my order' / order history / order status question.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(10).default(5).describe("How many recent orders to fetch"),
    }),
    execute: async ({ limit }) => {
      const rows = await db
        .select()
        .from(orders)
        .where(customerId ? eq(orders.customerId, customerId) : undefined)
        .orderBy(desc(orders.createdAt))
        .limit(limit);

      if (rows.length === 0) return { orders: [], note: "No orders found for this customer." };

      const result = [];
      for (const o of rows) {
        const items = await db
          .select({
            name: products.name,
            rawName: orderItems.rawProductName,
            quantity: orderItems.quantity,
            unit: orderItems.unit,
            unitPriceIdr: orderItems.unitPriceIdr,
          })
          .from(orderItems)
          .leftJoin(products, eq(orderItems.productId, products.id))
          .where(eq(orderItems.orderId, o.id));

        const total = items.reduce(
          (sum, i) => sum + (i.unitPriceIdr ?? 0) * i.quantity,
          0
        );

        result.push({
          orderRef: o.id.slice(0, 8),
          placedAt: o.createdAt,
          deliveryStage: DELIVERY_LABEL[o.deliveryStatus] ?? o.deliveryStatus,
          reviewStatus: o.status,
          cancellable: o.deliveryStatus === "placed" || o.deliveryStatus === "packed",
          orderedVia: o.sourceType,
          items: items.map((i) => ({
            product: i.name ?? `${i.rawName} (not matched to catalogue)`,
            quantity: `${i.quantity} ${i.unit}`,
          })),
          total: total > 0 ? formatIdr(total) : "not priced",
        });
      }
      return { orders: result };
    },
  });

  const searchProducts = tool({
    description:
      "Search the Wings product catalogue by product name or brand. Returns price, unit and any bulk discount. Use for price, availability, brand and discount questions.",
    inputSchema: z.object({
      query: z
        .string()
        .describe("Product or brand name to search for, e.g. 'Ale-Ale', 'Mie Sedaap', 'shampoo'"),
      discountedOnly: z
        .boolean()
        .default(false)
        .describe("Set true when the user only wants products that currently have a discount"),
    }),
    execute: async ({ query, discountedOnly }) => {
      // Catalogue is small, so match in memory: this tolerates hyphen/space and
      // casing differences ("Ale Ale" vs "Ale-Ale") and also searches aliases,
      // which a plain SQL ILIKE would miss.
      const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const needle = normalise(query);

      const rows = await db.select().from(products);
      const matches = rows.filter((p) => {
        const haystacks = [p.name, p.brand, p.sku, ...(p.aliases ?? [])].map(normalise);
        return haystacks.some((h) => h.includes(needle) || needle.includes(h));
      });

      const filtered = (
        discountedOnly ? matches.filter((p) => p.discountPercent != null) : matches
      ).slice(0, 12);

      if (filtered.length === 0) {
        return { products: [], note: `No catalogue match for "${query}".` };
      }

      return {
        products: filtered.map((p) => ({
          name: p.name,
          brand: p.brand,
          sku: p.sku,
          price: formatIdr(p.priceIdr),
          unit: p.unit,
          discount:
            p.discountPercent != null && p.discountMinQty != null
              ? `${p.discountPercent}% off when ordering ${p.discountMinQty}+ ${p.unit}`
              : "no bulk discount",
        })),
      };
    },
  });

  const listTopDiscounts = tool({
    description:
      "List the products with the biggest bulk discounts right now. Use when the user asks generally about deals, offers or promotions without naming a product.",
    inputSchema: z.object({
      limit: z.number().int().min(1).max(10).default(5),
    }),
    execute: async ({ limit }) => {
      const rows = await db.select().from(products);
      const discounted = rows
        .filter((p) => p.discountPercent != null)
        .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
        .slice(0, limit);

      return {
        deals: discounted.map((p) => ({
          name: p.name,
          brand: p.brand,
          price: formatIdr(p.priceIdr),
          discount: `${p.discountPercent}% off at ${p.discountMinQty}+ ${p.unit}`,
        })),
      };
    },
  });

  try {
    const result = await generateText({
      model: CHAT_MODEL,
      instructions: SYSTEM_PROMPT + languageDirective,
      messages,
      tools: { lookupOrders, searchProducts, listTopDiscounts },
      stopWhen: stepCountIs(6),
      temperature: 0.3,
    });

    return NextResponse.json({
      reply: result.text,
      toolsUsed: result.steps.flatMap((s) => s.toolCalls.map((c) => c.toolName)),
      model: result.response?.modelId ?? null,
      tokens: result.usage?.totalTokens ?? null,
    });
  } catch (err) {
    console.error("chat error", err);
    return NextResponse.json(
      { error: "The assistant is unavailable right now. Please try again." },
      { status: 500 }
    );
  }
}

export const maxDuration = 60;
