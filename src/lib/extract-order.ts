import { generateObject, generateText, transcribe } from "ai";
import { groq } from "@ai-sdk/groq";
import { buildOrderExtractionSchema } from "./order-schema";
import { buildCatalogPromptBlock, loadCatalog } from "./catalog";

const VISION_MODEL_ID = "qwen/qwen3.6-27b";
const EXTRACTION_MODEL_ID = "openai/gpt-oss-120b";
const TRANSCRIPTION_MODEL_ID = "whisper-large-v3";

const VISION_MODEL = groq(VISION_MODEL_ID);
const EXTRACTION_MODEL = groq(EXTRACTION_MODEL_ID);
const TRANSCRIPTION_MODEL = groq.transcription(TRANSCRIPTION_MODEL_ID);

const OCR_PROMPT = `Transcribe every line of text in this photo of a handwritten FMCG distributor order note, exactly as written, preserving line breaks. The text may be in English, Bahasa Indonesia, or a mix of both. Output only the transcription, no commentary.`;

const SYSTEM_PROMPT = `You read handwritten or spoken FMCG distributor orders written in English, Bahasa Indonesia, or a mix of both, for the Indonesian FMCG brand Wings. Extract every line item with its quantity, match it against the provided product catalog when possible, and return the requested structured data.

Be honest about whether a real order is actually present:
- If the handwriting is messy or the audio is mumbled but you can still tell someone is naming a product and a quantity, make your best-effort reading and include the item — do not skip a real attempted order just because it's unclear.
- If the source text is silence, background noise, a Whisper transcription artifact (e.g. stock phrases like "thank you for watching" with no other context), random unrelated speech, test/gibberish input, or otherwise contains no genuine product + quantity mention, you MUST set hasOrder to false and return an empty items array. Do NOT invent, guess, or hallucinate plausible-sounding products or quantities that were not actually said or written. When in doubt about whether ANY order was intended, prefer hasOrder: false over fabricating content.`;

export type ExtractionMeta = {
  extractionModel: string | null;
  extractionTokens: number | null;
  extractionMs: number | null;
};

async function extractFromText(rawText: string, priorMs = 0, priorTokens = 0) {
  if (rawText.trim().length < 3) {
    return {
      hasOrder: false as const,
      language: "unknown" as const,
      orderDate: null,
      items: [],
      notes: null,
      rawText,
      extractionModel: null,
      extractionTokens: null,
      extractionMs: priorMs || null,
    };
  }

  const catalog = await loadCatalog();
  const schema = buildOrderExtractionSchema(catalog.map((p) => p.name));
  const catalogBlock = buildCatalogPromptBlock(catalog);

  const startedAt = Date.now();
  const { object, usage, response } = await generateObject({
    model: EXTRACTION_MODEL,
    schema,
    instructions: SYSTEM_PROMPT,
    temperature: 0,
    prompt: `Product catalog:\n${catalogBlock}\n\nSource text:\n${rawText}\n\nExtract the order from the source text above.`,
  });
  const elapsed = Date.now() - startedAt;

  const items = object.hasOrder ? object.items : [];
  return {
    ...object,
    items,
    rawText: object.rawText || rawText,
    extractionModel: response?.modelId ?? EXTRACTION_MODEL_ID,
    extractionTokens: (usage?.totalTokens ?? 0) + priorTokens || null,
    extractionMs: elapsed + priorMs,
  };
}

export async function extractOrderFromImage(imageBuffer: Buffer) {
  const startedAt = Date.now();
  const { text: ocrText, usage } = await generateText({
    model: VISION_MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: OCR_PROMPT },
          { type: "file", data: imageBuffer, mediaType: "image/jpeg" },
        ],
      },
    ],
  });

  return extractFromText(ocrText, Date.now() - startedAt, usage?.totalTokens ?? 0);
}

export async function extractOrderFromAudio(audioBuffer: Buffer) {
  const startedAt = Date.now();
  const { text } = await transcribe({
    model: TRANSCRIPTION_MODEL,
    audio: audioBuffer,
  });

  return extractFromText(text, Date.now() - startedAt, 0);
}
