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
        quantity: z.number().describe("Numeric quantity ordered"),
        unit: z.string().nullable().describe("Unit of measure if mentioned, e.g. box, pcs, karton"),
      })
    ),
    notes: z.string().nullable().describe("Any other relevant notes from the order"),
    rawText: z
      .string()
      .describe("Best-effort verbatim transcription/OCR of the source note or voice message"),
  });
}

export type OrderExtraction = z.infer<
  ReturnType<typeof buildOrderExtractionSchema>
>;
