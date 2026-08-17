import type { LangfuseSpanProcessor } from "@langfuse/otel";
import { propagateAttributes, startActiveObservation } from "@langfuse/tracing";

/**
 * Langfuse tracing for the AI pipeline — what each order cost, in tokens and
 * money, and which stage spent it.
 *
 * Everything here is optional at runtime. With LANGFUSE_PUBLIC_KEY /
 * LANGFUSE_SECRET_KEY unset, `startTelemetry()` returns undefined, no tracer
 * provider is registered, and the `@langfuse/tracing` calls sprinkled through
 * the pipeline resolve to OpenTelemetry's no-op tracer. The app runs exactly as
 * it did before — an unconfigured deployment must never fail on observability.
 *
 * The processor is held on globalThis rather than a module-level variable
 * because instrumentation.ts and the route handlers are separate bundles: a
 * module-scoped instance registered at startup is NOT the same instance a route
 * would import, so the flush would silently no-op and spans would be dropped
 * on serverless freeze.
 */
const PROCESSOR_KEY = "__wingsLangfuseSpanProcessor";

type ProcessorHolder = { [PROCESSOR_KEY]?: LangfuseSpanProcessor };

function holder() {
  return globalThis as unknown as ProcessorHolder;
}

export function getSpanProcessor() {
  return holder()[PROCESSOR_KEY];
}

/**
 * Boots OpenTelemetry with the Langfuse exporter and registers the AI SDK v7
 * telemetry integration. Called from instrumentation.ts for the app, and
 * directly by scripts/eval-extraction.ts, which runs outside Next and so never
 * hits the instrumentation hook.
 *
 * The heavy imports are dynamic so that @opentelemetry/sdk-node is only ever
 * pulled into the process that actually boots tracing, not into every route
 * bundle that wants `flushTelemetry`.
 */
export async function startTelemetry() {
  const existing = getSpanProcessor();
  if (existing) return existing;

  if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    return undefined;
  }

  const [{ NodeSDK }, { LangfuseSpanProcessor }, { LangfuseVercelAiSdkIntegration }, { registerTelemetry }] =
    await Promise.all([
      import("@opentelemetry/sdk-node"),
      import("@langfuse/otel"),
      import("@langfuse/vercel-ai-sdk"),
      import("ai"),
    ]);

  const processor = new LangfuseSpanProcessor({
    // Serverless functions are frozen the moment the response is returned, so
    // batching there loses whatever has not shipped yet. Long-lived processes
    // (local dev, the eval harness) keep the batched default.
    exportMode: process.env.VERCEL ? "immediate" : "batched",
    environment:
      process.env.LANGFUSE_TRACING_ENVIRONMENT ?? process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });

  new NodeSDK({ spanProcessors: [processor] }).start();

  // AI SDK v7 replaced the old span-emitting `experimental_telemetry` path with
  // callback integrations. Registered once here, every generateText /
  // generateObject call in the app is traced without per-call wiring; the
  // `telemetry.functionId` on each call site only names it.
  registerTelemetry(new LangfuseVercelAiSdkIntegration());

  holder()[PROCESSOR_KEY] = processor;
  return processor;
}

/** Ship whatever is buffered. Pass to `after()` so it runs post-response. */
export async function flushTelemetry() {
  await getSpanProcessor()?.forceFlush();
}

export type TraceAttributes = {
  /** Groups every model call of one upload/turn under a single trace. */
  traceName: string;
  userId?: string | null;
  sessionId?: string | null;
  tags?: string[];
  metadata?: Record<string, string>;
};

/**
 * Wraps a pipeline in one parent span so that its stages — STT, OCR,
 * extraction, tool calls — appear as children of a single trace with one
 * roll-up cost, instead of as unrelated top-level generations.
 */
export async function traced<T>(attributes: TraceAttributes, fn: () => Promise<T>): Promise<T> {
  const { traceName, userId, sessionId, tags, metadata } = attributes;

  return startActiveObservation(traceName, () =>
    propagateAttributes(
      {
        traceName,
        ...(userId ? { userId } : {}),
        ...(sessionId ? { sessionId } : {}),
        ...(tags ? { tags } : {}),
        ...(metadata ? { metadata } : {}),
      },
      fn
    )
  );
}
