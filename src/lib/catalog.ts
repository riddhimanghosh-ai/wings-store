import { getDb } from "@/db";
import { products } from "@/db/schema";
import { DEFAULT_NUMERAL_LOCALE, numeralKeyterms } from "./numerals";

export async function loadCatalog() {
  const db = getDb();
  return db.select().from(products);
}

/**
 * The units of measure this deployment sells by, read from the catalog, so a
 * market that stocks by "renceng" or "krat" primes the transcriber for those
 * words without anyone editing code.
 *
 * Deliberately NOT sourced from order_items.unit as well. Those values are
 * written by the extractor itself, so past mistakes ("bunkus", "sachets",
 * "pieces") would be fed back in as authoritative vocabulary and reinforced —
 * the catalog is the human-curated side of the loop.
 */
export async function loadKnownUnits() {
  const db = getDb();
  const rows = await db.selectDistinct({ unit: products.unit }).from(products);

  return [
    ...new Set(
      rows.map((r) => r.unit?.trim().toLowerCase()).filter((u): u is string => !!u)
    ),
  ];
}

export function buildCatalogPromptBlock(
  catalog: Awaited<ReturnType<typeof loadCatalog>>
) {
  return catalog
    .map(
      (p) =>
        `- ${p.name} [sold by: ${p.unit}] (aliases: ${p.aliases.join(", ") || "none"})`
    )
    .join("\n");
}

/**
 * Groq's transcription API rejects — does not truncate — a prompt longer than
 * this, so the limit has to be enforced here. The value is the provider's own,
 * quoted verbatim from its error: "prompt length must be 896 characters or
 * fewer".
 */
const MAX_STT_PROMPT_CHARS = 896;

/**
 * Prompt passed to Whisper as transcription context. Whisper conditions on this
 * text, so it biases decoding toward the brands, units and number words this
 * deployment actually uses. Every term is read from the database except the
 * numerals, which are a property of the language rather than of the data.
 *
 * Priority under the character cap is measured, not assumed. An ablation over
 * the voice fixtures showed the numerals carry the whole quantity fix (without
 * them a spoken "<digit> puluh" comes back as one run-on token and the quantity
 * is lost), while brand priming is worth a modest transcription improvement
 * ("Sok Klin" rather than "soclean"). So numerals and units are always present
 * and brands fill whatever budget is left — a catalog too large to fit gives up
 * brand priming and never the numbers.
 */
export function buildSttKeytermPrompt(
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
  knownUnits: string[],
  locale: string = DEFAULT_NUMERAL_LOCALE
) {
  const required = `Satuan: ${knownUnits.join(", ")}. Jumlah: ${numeralKeyterms(locale).join(", ")}.`;
  const opening = "Pesanan / order FMCG.";

  const brandBudget = MAX_STT_PROMPT_CHARS - required.length - opening.length - " Merek: .  ".length;
  const brands: string[] = [];
  let used = 0;
  for (const brand of new Set(catalog.map((p) => p.brand))) {
    if (used + brand.length + 2 > brandBudget) break;
    brands.push(brand);
    used += brand.length + 2;
  }

  const prompt = brands.length
    ? `${opening} Merek: ${brands.join(", ")}. ${required}`
    : `${opening} ${required}`;

  // Safety net: a locale or unit list large enough to blow the budget on its
  // own would otherwise fail the request outright rather than degrade.
  return prompt.slice(0, MAX_STT_PROMPT_CHARS);
}
