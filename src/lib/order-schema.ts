import { z } from "zod";

export function buildOrderExtractionSchema(catalogNames: string[]) {
  const matchedProductName =
    catalogNames.length > 0
      ? z.enum(catalogNames as [string, ...string[]]).nullable()
      : z.null();

  return z.object({
    hasOrder: z
      .boolean()
      .describe(
        "true only if the source text contains at least one genuine, identifiable product + quantity mention. false if the source is silence, noise, gibberish, an unrelated conversation, or otherwise contains no real order — in that case items must be an empty array."
      ),
    language: z.enum(["en", "id", "mixed", "unknown"]),
    orderDate: z
      .string()
      .nullable()
      .describe("ISO 8601 date (YYYY-MM-DD) if a date is mentioned, otherwise null"),
    items: z.array(
      z.object({
        rawProductName: z
          .string()
          .describe("Product name exactly as written or spoken"),
        matchedProductName: matchedProductName.describe(
          "The best-matching product name from the provided catalog list, or null if no confident match"
        ),
        quantity: z
          .number()
          .int()
          .positive()
          .nullable()
          .describe(
            "Quantity ordered, as a positive integer. Indonesian number words must be converted (e.g. 'tujuh puluh' -> 70, 'sepuluh' -> 10, 'dua lusin' -> 2 with unit 'lusin'). Use null — never 1 — when a quantity was clearly stated but could not be resolved; 1 is only valid when the source actually says one/satu/se- or names a product with no number at all."
          ),
        unit: z
          .string()
          .nullable()
          .describe("Unit of measure exactly as mentioned, e.g. box, pcs, dus, karton, lusin, sachet"),
      })
    ),
    notes: z.string().nullable().describe("Any other relevant notes from the order"),
  });
}

export type OrderExtraction = z.infer<
  ReturnType<typeof buildOrderExtractionSchema>
>;
