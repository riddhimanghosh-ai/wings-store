import { generateObject, generateText, transcribe, APICallError } from "ai";
import { groq } from "@ai-sdk/groq";
import { startObservation } from "@langfuse/tracing";
import { vertex } from "./vertex";
import { buildOrderExtractionSchema } from "./order-schema";
import {
  DEFAULT_NUMERAL_LOCALE,
  numeralGlossaryBlock,
  onePrefix,
  scaleWords,
} from "./numerals";
import {
  buildCatalogPromptBlock,
  buildSttKeytermPrompt,
  loadCatalog,
  loadKnownUnits,
} from "./catalog";

export class SttRateLimitError extends Error {
  constructor() {
    super("Voice transcription is temporarily busy. Please try again in a few minutes.");
    this.name = "SttRateLimitError";
  }
}

/**
 * The pipeline runs on exactly two models: Gemini for everything that reads
 * (vision OCR, order extraction) and Groq Whisper for speech. Keep it that way
 * — a third model is a third accuracy profile to benchmark and regress.
 *
 * NOT the -lite tier, for either job. Measured on the fixture suite: given a
 * *correct* transcript, flash-lite deterministically drops the quantity
 * (returns null) of the second of two items that state the SAME quantity in one
 * run-on spoken line — "tujuh puluh sachet, <product A>, tujuh puluh sachet,
 * <product B>" yields 70 for A and null for B. It reads the repeated number as
 * an echo of the one it already used rather than a second real quantity. Prompt
 * wording does not shift it; flash reads the same input correctly and
 * deterministically.
 */
const GEMINI_MODEL_ID = "gemini-3.5-flash";
const TRANSCRIPTION_MODEL_ID = "whisper-large-v3";

const EXTRACTION_MODEL = vertex(GEMINI_MODEL_ID);
const VISION_MODEL = vertex(GEMINI_MODEL_ID);
const GROQ_TRANSCRIPTION_MODEL = groq.transcription(TRANSCRIPTION_MODEL_ID);

const OCR_PROMPT = `Transcribe every line of text in this photo of a handwritten FMCG distributor order note, exactly as written, preserving line breaks. The text may be in English, Bahasa Indonesia, or a mix of both. The page may be photographed sideways or upside down — mentally rotate it and read every line.

Read the digits with particular care; they are the part that matters most:
- Many writers use a continental crossed seven (a 7 with a bar through it). It is a SEVEN — do not read it as a 1, 2 or 4.
- A crossed or serifed one is still a ONE. Do not promote it to a 7.
- Transcribe a multi-digit number as the whole number it is, keeping every digit and its place value. Do not drop or add a trailing zero.
- If a digit is genuinely illegible, write it as "?" rather than guessing a plausible number.

Output only the transcription, no commentary.`;

async function callGroqWhisperStt(audioBuffer: Buffer, keytermPrompt: string) {
  // `transcribe()` takes no telemetry option in AI SDK v7 — the integration
  // only covers text/object/embed/rerank — so this stage is traced by hand.
  // Without it the voice trace would show extraction only, and STT latency
  // (usually the larger half) would be invisible.
  const observation = startObservation(
    "stt-whisper",
    {
      model: TRANSCRIPTION_MODEL_ID,
      input: { keytermPrompt },
      metadata: { provider: "groq", audioBytes: audioBuffer.byteLength },
    },
    { asType: "generation" }
  );

  try {
    const { text } = await transcribe({
      model: GROQ_TRANSCRIPTION_MODEL,
      audio: audioBuffer,
      providerOptions: {
        groq: {
          // Deliberately NO `language` hint: pinning it to "id" makes Whisper
          // translate English orders into Indonesian ("Deliver by Friday" ->
          // "Dilihat pada hari Jumat"). Auto-detect plus the keyterm prompt
          // recovers Indonesian numerals without breaking English input.
          prompt: keytermPrompt,
          temperature: 0,
        },
      },
    });

    // No usageDetails: Whisper bills by audio duration, not tokens, and the
    // duration is not in the response. Inventing a token count here would put a
    // fabricated number next to the real Gemini ones in the cost roll-up.
    observation.update({ output: text }).end();

    return { text };
  } catch (err) {
    const rateLimited = APICallError.isInstance(err) && err.statusCode === 429;
    observation
      .update({
        level: "ERROR",
        statusMessage: rateLimited ? "groq rate limit (429)" : String(err),
      })
      .end();

    if (rateLimited) {
      throw new SttRateLimitError();
    }
    throw err;
  }
}

async function callVisionOcr(imageBuffer: Buffer) {
  const { text, usage } = await generateText({
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
    telemetry: {
      functionId: "ocr-vision",
      // The only variable input here is the photo itself, and recording it
      // ships every uploaded image to Langfuse. Outputs are kept — the raw OCR
      // text is what you diagnose a misread against. Flip to true when you need
      // the image alongside it (see README: Observability).
      recordInputs: false,
    },
  });

  return { text, tokens: usage?.totalTokens ?? 0 };
}

function buildSystemPrompt(locale: string = DEFAULT_NUMERAL_LOCALE) {
  return `You read handwritten or spoken FMCG distributor orders written in English, Bahasa Indonesia, or a mix of both. Extract every line item with its quantity, match it against the provided product catalog when possible, and return the requested structured data.

QUANTITIES — this is the part that goes wrong most often, so work through it carefully.

Quantities are often spoken or written as words rather than digits. This is the full
word-to-integer table for the language; convert using it:
${numeralGlossaryBlock(locale)}

Compound forms combine the parts additively — a scale word followed by a smaller number adds
them together. The "${onePrefix(locale)}-" prefix on a scale word means one of that scale.

Speech-to-text often runs these words together into a single token, drops a trailing
consonant, or renders them as an English near-homophone. Read the token by how it SOUNDS
rather than how it is spelled, and recover the intended number from its shape: a token whose
tail sounds like one of the scale words (${scaleWords(locale).join(", ")}) takes that scale, and
its leading syllable gives the multiplier. A garbled number word is never 1 unless it
actually sounds like the word for one, or the one-prefix.

A unit of measure is not a multiplier. Record the unit exactly as stated and put the stated
count in quantity — "<n> <unit>" is quantity <n> with that unit, never <n> expanded into the
number of individual pieces that unit contains. Each catalog entry below lists the unit it is
normally sold by; use that to sanity-check a reading, not to override what the source says.

The quantity may come before OR after the product name. Indonesian notes commonly lead with
it ("<number> <unit> <product>"); English ones usually trail it ("<product> - <number>
<unit>"). Attach each number to the product it actually belongs to, and never carry a
quantity across to a following product that states its own.

NEVER default a quantity to 1 because you are unsure. 1 is only correct when the source
genuinely says one, or names a product with no number at all in a context where a single unit
is clearly meant. If a quantity was clearly stated but you cannot resolve what it was, set
quantity to null so a human reviews it. A null is always better than a wrong number.

Be honest about whether a real order is actually present:
- If the handwriting is messy or the audio is mumbled but you can still tell someone is naming a product and a quantity, make your best-effort reading and include the item — do not skip a real attempted order just because it's unclear.
- If the source text is silence, background noise, a transcription artifact (e.g. stock phrases like "thank you for watching" with no other context), random unrelated speech, test/gibberish input, or otherwise contains no genuine product + quantity mention, you MUST set hasOrder to false and return an empty items array. Do NOT invent, guess, or hallucinate plausible-sounding products or quantities that were not actually said or written. When in doubt about whether ANY order was intended, prefer hasOrder: false over fabricating content.`;
}

export type ExtractionMeta = {
  extractionModel: string | null;
  extractionTokens: number | null;
  extractionMs: number | null;
};

type SourceMeta = {
  sourceModel: string | null;
  sourceConfidence: number | null;
  sourceMs: number | null;
};

type Catalog = Awaited<ReturnType<typeof loadCatalog>>;

async function extractFromText(
  rawText: string,
  source: SourceMeta,
  priorTokens = 0,
  preloadedCatalog?: Catalog
) {
  if (rawText.trim().length < 3) {
    return {
      hasOrder: false as const,
      language: "unknown" as const,
      orderDate: null,
      items: [],
      notes: null,
      rawText,
      ...source,
      extractionModel: null,
      extractionTokens: null,
      extractionMs: source.sourceMs || null,
    };
  }

  const catalog = preloadedCatalog ?? (await loadCatalog());
  const schema = buildOrderExtractionSchema(catalog.map((p) => p.name));
  const catalogBlock = buildCatalogPromptBlock(catalog);

  const startedAt = Date.now();
  const { object, usage, response } = await generateObject({
    model: EXTRACTION_MODEL,
    schema,
    instructions: buildSystemPrompt(),
    temperature: 0,
    prompt: `Product catalog:\n${catalogBlock}\n\nSource text:\n${rawText}\n\nExtract the order from the source text above.`,
    telemetry: { functionId: "extract-order" },
  });
  const elapsed = Date.now() - startedAt;

  const items = object.hasOrder ? object.items : [];
  return {
    ...object,
    items,
    // Always the true STT/OCR output. The model used to re-emit rawText as a
    // schema field, so the "transcript" shown in admin was its own rewrite —
    // which made it impossible to tell whether a bad quantity came from
    // transcription or from extraction.
    rawText,
    ...source,
    extractionModel: response?.modelId ?? GEMINI_MODEL_ID,
    extractionTokens: (usage?.totalTokens ?? 0) + priorTokens || null,
    extractionMs: elapsed + (source.sourceMs ?? 0),
  };
}

export async function extractOrderFromImage(imageBuffer: Buffer) {
  const startedAt = Date.now();

  const { text: ocrText, tokens } = await callVisionOcr(imageBuffer);

  return extractFromText(
    ocrText,
    { sourceModel: GEMINI_MODEL_ID, sourceConfidence: null, sourceMs: Date.now() - startedAt },
    tokens
  );
}

export async function extractOrderFromAudio(audioBuffer: Buffer) {
  const startedAt = Date.now();
  // Loaded up front so the catalog's own brands and units can bias
  // transcription, then reused for extraction instead of hitting the DB twice.
  const [catalog, knownUnits] = await Promise.all([loadCatalog(), loadKnownUnits()]);
  const { text } = await callGroqWhisperStt(
    audioBuffer,
    buildSttKeytermPrompt(catalog, knownUnits)
  );

  return extractFromText(
    text,
    {
      sourceModel: TRANSCRIPTION_MODEL_ID,
      sourceConfidence: null,
      sourceMs: Date.now() - startedAt,
    },
    0,
    catalog
  );
}
