import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { extractOrderFromImage, extractOrderFromAudio } from "../src/lib/extract-order";

type GroundTruthItem = {
  rawText: string;
  quantity: number;
  unit: string;
  expectedProduct: string | null;
};

type GroundTruth = {
  path: string;
  sourceType: "photo" | "voice";
  verified: boolean;
  expectedLanguage?: string;
  orderDate?: string | null;
  notes?: string | null;
  items: GroundTruthItem[];
};

type ExtractedItem = {
  rawProductName: string;
  matchedProductName: string | null;
  quantity: number;
  unit: string | null;
};

type RunResult = {
  hasOrder: boolean;
  language: string;
  items: ExtractedItem[];
  extractionTokens: number | null;
  extractionMs: number | null;
};

type Args = { runs: number; label: string; only: string | null; delayMs: number };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const runs = Number(args.find((a) => a.startsWith("--runs="))?.split("=")[1] ?? 3);
  const label = args.find((a) => a.startsWith("--label="))?.split("=")[1] ?? "run";
  const only = args.find((a) => a.startsWith("--only="))?.split("=")[1] ?? null;
  const delayMs = Number(args.find((a) => a.startsWith("--delayMs="))?.split("=")[1] ?? 15000);
  return { runs, label, only, delayMs };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>, label: string, maxAttempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimit = /rate.?limit|429/i.test(message);
      const waitMs = isRateLimit ? 65_000 : 5_000 * attempt;
      console.log(`  [${label}] attempt ${attempt} failed (${isRateLimit ? "rate limit" : "error"}): ${message.slice(0, 120)} — retrying in ${waitMs}ms`);
      await sleep(waitMs);
    }
  }
  throw lastErr;
}

function matchItems(gtItems: GroundTruthItem[], extracted: ExtractedItem[]) {
  const remaining = [...extracted];
  const matched: { gt: GroundTruthItem; extracted: ExtractedItem | null; productCorrect: boolean | null }[] = [];

  for (const gt of gtItems) {
    const idx = remaining.findIndex((e) => e.quantity === gt.quantity);
    if (idx === -1) {
      matched.push({ gt, extracted: null, productCorrect: gt.expectedProduct === null ? null : false });
      continue;
    }
    const extractedItem = remaining.splice(idx, 1)[0];
    const productCorrect =
      gt.expectedProduct === null ? null : extractedItem.matchedProductName === gt.expectedProduct;
    matched.push({ gt, extracted: extractedItem, productCorrect });
  }

  return { matched, extraItems: remaining };
}

function summarizeRun(gt: GroundTruth, run: RunResult) {
  const { matched, extraItems } = matchItems(gt.items, run.items);
  const found = matched.filter((m) => m.extracted !== null).length;
  const scorable = matched.filter((m) => m.productCorrect !== null);
  const productCorrect = scorable.filter((m) => m.productCorrect === true).length;

  return {
    recall: gt.items.length ? found / gt.items.length : 1,
    precision: run.items.length ? found / run.items.length : found === 0 ? 1 : 0,
    productAccuracy: scorable.length ? productCorrect / scorable.length : null,
    extraItemCount: extraItems.length,
    missedCount: gt.items.length - found,
    itemCount: run.items.length,
    hasOrder: run.hasOrder,
    language: run.language,
    extractionTokens: run.extractionTokens,
    extractionMs: run.extractionMs,
  };
}

function mean(xs: number[]) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function stdev(xs: number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

const AUDIO_MIME_BY_EXT: Record<string, string> = {
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".webm": "audio/webm",
  ".mp3": "audio/mpeg",
};

async function runFixture(name: string, gt: GroundTruth, runs: number, delayMs: number) {
  const filePath = path.isAbsolute(gt.path) ? gt.path : path.resolve(process.cwd(), gt.path);
  const buffer = await readFile(filePath);
  const mimeType = AUDIO_MIME_BY_EXT[path.extname(filePath).toLowerCase()] ?? "audio/wav";

  const runResults: RunResult[] = [];
  for (let i = 0; i < runs; i++) {
    if (i > 0) await sleep(delayMs);
    const result = await withRetry(
      () => (gt.sourceType === "photo" ? extractOrderFromImage(buffer) : extractOrderFromAudio(buffer, mimeType)),
      `${name} run ${i + 1}`
    );
    runResults.push({
      hasOrder: result.hasOrder,
      language: result.language,
      items: result.items.map((it) => ({
        rawProductName: it.rawProductName,
        matchedProductName: it.matchedProductName ?? null,
        quantity: it.quantity,
        unit: it.unit ?? null,
      })),
      extractionTokens: result.extractionTokens ?? null,
      extractionMs: result.extractionMs ?? null,
    });
    console.log(`  run ${i + 1}/${runs} done — ${result.items.length} items, ${result.extractionTokens ?? "?"} tokens`);
  }

  const summaries = runResults.map((r) => summarizeRun(gt, r));
  const itemCounts = runResults.map((r) => r.items.length);

  return {
    fixture: name,
    verified: gt.verified,
    runs: summaries,
    aggregate: {
      meanRecall: mean(summaries.map((s) => s.recall)),
      meanPrecision: mean(summaries.map((s) => s.precision)),
      meanProductAccuracy: mean(summaries.map((s) => s.productAccuracy ?? 1)),
      meanTokens: mean(summaries.map((s) => s.extractionTokens ?? 0)),
      meanMs: mean(summaries.map((s) => s.extractionMs ?? 0)),
      itemCountConsistency: stdev(itemCounts) === 0 ? "consistent" : `varied (${itemCounts.join(",")})`,
      allRunsHadOrder: summaries.every((s) => s.hasOrder),
    },
    rawRuns: runResults,
  };
}

async function main() {
  const { runs, label, only, delayMs } = parseArgs();
  const gtPath = path.resolve(process.cwd(), "sample-data/fixtures/ground-truth.json");
  const groundTruth: Record<string, GroundTruth> = JSON.parse(await readFile(gtPath, "utf-8"));

  const fixtureNames = Object.keys(groundTruth).filter((k) => !k.startsWith("_"));
  const targets = only ? fixtureNames.filter((n) => n === only) : fixtureNames;

  console.log(`Running ${targets.length} fixture(s) x ${runs} runs, label="${label}"\n`);

  const results = [];
  for (const [idx, name] of targets.entries()) {
    if (idx > 0) await sleep(delayMs);
    console.log(`=== ${name} (verified: ${groundTruth[name].verified}) ===`);
    const result = await runFixture(name, groundTruth[name], runs, delayMs);
    results.push(result);
    console.log(
      `  recall=${result.aggregate.meanRecall.toFixed(2)} precision=${result.aggregate.meanPrecision.toFixed(2)} productAcc=${result.aggregate.meanProductAccuracy.toFixed(2)} tokens=${result.aggregate.meanTokens.toFixed(0)} ms=${result.aggregate.meanMs.toFixed(0)} items=${result.aggregate.itemCountConsistency}\n`
    );
  }

  const outDir = path.resolve(process.cwd(), "benchmark-results");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${label}.json`);
  await writeFile(outPath, JSON.stringify({ label, runs, generatedFixtures: targets, results }, null, 2));
  console.log(`Full results written to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
