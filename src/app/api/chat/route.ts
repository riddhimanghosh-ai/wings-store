import { NextRequest, NextResponse } from "next/server";
import { generateText, tool, stepCountIs } from "ai";
import { vertex } from "@/lib/vertex";
import { z } from "zod";
import { getDb } from "@/db";
import { orders, orderItems, products } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { formatIdr } from "@/lib/format";

// Same Gemini tier as the order pipeline — see src/lib/extract-order.ts. The
// app deliberately runs on two models total: this one and Groq Whisper.
const CHAT_MODEL = vertex("gemini-3.5-flash");

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
- All prices are Indonesian Rupiah. You cannot change, cancel, or place orders yourself; explain where in the app to do it instead.

Voice — you are a friendly shop assistant in a quick-commerce app, NOT a corporate helpdesk:
- Be warm, casual and quick. Short punchy lines. Sound like a helpful person, not a policy document.
- In English use contractions ("you've", "it's", "here's") and everyday words. Never write "Here are the current discounts available for" — write "Got 3 deals on Mie Sedaap right now 👇".
- In Bahasa Indonesia keep it santai and everyday — "kamu", not "Anda". Never stiff formal phrasing like "Berikut adalah informasi mengenai".
- BANNED openers: "Here are", "Here is", "Berikut adalah", "Sure", "Of course", "I found", "Saya menemukan". Just say the thing.
- Use at most ONE emoji per reply, on the lead line, and only when it genuinely fits (🎉 deals, 📦 delivery, 👇 pointing to a list). Never put emoji on every bullet.
- Never apologise more than four words. "No luck on that one" beats a formal apology.

Answer format — this renders in a narrow mobile chat bubble, so structure matters:
- Open with ONE short line that answers the question directly — ideally under 10 words.
- Then, when there is more than one fact, put each on its own line starting with "- ".
- Label each bullet in **bold**, then an em dash between each separate fact:
  "- **Ale-Ale 200ml:** Rp 3.500 — 8% off at 50+". The app lays the label, the
  price and the discount out as their own elements by splitting on that em dash,
  so keep exactly this shape: bold name, colon INSIDE the bold, then the facts
  separated by " — ". Never put the price inside the bold span.
- Put ONE fact per em-dash segment. Do not chain "Rp 3.500 — 8% off — at 50+";
  the minimum quantity belongs with the discount it applies to.
- Keep bullets terse: product, price, deal. Drop filler words like "when ordering a minimum of" — use "at 20+" instead.
- Cap it at 6 bullets. If a tool returned more, show the best and say how many more there are.
- When listing a product always include price and, if any, the discount plus its minimum quantity.
- Close with one short nudge only if the user needs to act ("Tap the catalogue to add them 👇"). Otherwise just stop.
- Supported formatting is ONLY "- " bullets and **bold**. Never use #, tables, numbered lists, or nested indentation — they do not render.
- A one-fact answer stays a single short sentence with no bullets. Do not pad.`;

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
          (sum, i) => sum + (i.unitPriceIdr ?? 0) * (i.quantity ?? 0),
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
