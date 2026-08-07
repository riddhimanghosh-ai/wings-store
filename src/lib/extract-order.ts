import { generateObject, generateText } from "ai";
import { createVertex } from "@ai-sdk/google-vertex";
import { groq } from "@ai-sdk/groq";
import { buildOrderExtractionSchema } from "./order-schema";
import { buildCatalogPromptBlock, loadCatalog } from "./catalog";

const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION,
});

// "gemini" (default) or "groq" — lets us A/B OCR providers without code changes.
const OCR_PROVIDER = process.env.OCR_PROVIDER === "groq" ? "groq" : "gemini";

const GEMINI_VISION_MODEL_ID = "gemini-3.5-flash-lite";
const GROQ_VISION_MODEL_ID = "qwen/qwen3.6-27b";
const EXTRACTION_MODEL_ID = "gemini-3.5-flash-lite";
const TRANSCRIPTION_MODEL_ID = "nova-3";

const EXTRACTION_MODEL = vertex(EXTRACTION_MODEL_ID);
const GEMINI_VISION_MODEL = vertex(GEMINI_VISION_MODEL_ID);
const GROQ_VISION_MODEL = groq(GROQ_VISION_MODEL_ID);

const OCR_PROMPT = `Transcribe every line of text in this photo of a handwritten FMCG distributor order note, exactly as written, preserving line breaks. The text may be in English, Bahasa Indonesia, or a mix of both. Output only the transcription, no commentary.`;

async function callDeepgramStt(audioBuffer: Buffer, mimeType: string) {
  const url = `https://api.deepgram.com/v1/listen?model=${TRANSCRIPTION_MODEL_ID}&detect_language=en&detect_language=id`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": mimeType,
    },
    body: new Uint8Array(audioBuffer),
  });

  if (!res.ok) {
    throw new Error(`Deepgram request failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const channel = data.results?.channels?.[0];
  const alternative = channel?.alternatives?.[0];
  return {
    text: alternative?.transcript ?? "",
    detectedLanguage: channel?.detected_language ?? null,
    confidence: alternative?.confidence ?? null,
  };
}

async function callGeminiVisionOcr(imageBuffer: Buffer) {
  const { text, usage } = await generateText({
    model: GEMINI_VISION_MODEL,
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

  return { text, tokens: usage?.totalTokens ?? 0 };
}

async function callGroqVisionOcr(imageBuffer: Buffer) {
  const { text, usage } = await generateText({
    model: GROQ_VISION_MODEL,
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

  return { text, tokens: usage?.totalTokens ?? 0 };
}

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

  const { text: ocrText, tokens } =
    OCR_PROVIDER === "groq" ? await callGroqVisionOcr(imageBuffer) : await callGeminiVisionOcr(imageBuffer);

  return extractFromText(ocrText, Date.now() - startedAt, tokens);
}

export async function extractOrderFromAudio(audioBuffer: Buffer, mimeType: string) {
  const startedAt = Date.now();
  const { text } = await callDeepgramStt(audioBuffer, mimeType);

  return extractFromText(text, Date.now() - startedAt, 0);
}
