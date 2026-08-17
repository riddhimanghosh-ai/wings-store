This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Branches and deployments

This repo drives two Vercel apps from one codebase:

| Branch | UI | Production URL |
|---|---|---|
| `main` | AI-generated UI (navy, Zepto-style) | https://wings-order-assistant.vercel.app |
| `wings-online-ui` | Replica of the live Wings Online app | https://wings-store-replica.vercel.app |

Each Vercel project has its own production branch and an Ignored Build Step
so it only builds its own branch. Both share the same Neon database, Blob
store and Groq key, so orders placed in either app appear in both and in the
admin console.

## Observability (Langfuse)

Every model call in the pipeline is traced to [Langfuse](https://langfuse.com):
tokens in/out, latency per stage, and cost. Tracing is **entirely optional** —
with the two keys below unset the app behaves exactly as before, because
`startTelemetry()` bails out and the tracing calls fall through to
OpenTelemetry's no-op tracer.

```bash
LANGFUSE_PUBLIC_KEY="pk-lf-..."
LANGFUSE_SECRET_KEY="sk-lf-..."
LANGFUSE_BASE_URL="https://cloud.langfuse.com"   # or your self-hosted URL
LANGFUSE_TRACING_ENVIRONMENT="production"        # optional; defaults to VERCEL_ENV / NODE_ENV
```

How it is wired:

- `src/instrumentation.ts` — Next's startup hook. Boots the OpenTelemetry Node
  SDK with `LangfuseSpanProcessor` and registers the AI SDK v7 telemetry
  integration once per server instance. Node runtime only.
- `src/lib/telemetry.ts` — the bootstrap, the `flushTelemetry()` helper and
  `traced()`, which wraps a pipeline in one parent span.
- Each AI call carries a `telemetry.functionId`: `ocr-vision`,
  `extract-order`, `support-chat`.

Three things worth knowing:

1. **One trace per upload, not per model call.** A voice order is two billed
   calls (Whisper, then Gemini) and a chat reply can be up to six. The routes
   wrap the pipeline in `traced()` so the cost you read is the cost of the whole
   order or turn. `userId`/`sessionId` are the customer id, so spend rolls up
   per customer.
2. **Spans are flushed after the response** via `after(flushTelemetry)`. On
   Vercel the function is frozen the moment it responds, so the exporter also
   switches to `exportMode: "immediate"` there. Tracing adds no latency to the
   upload and still nothing is dropped.
3. **STT is traced by hand.** AI SDK v7's telemetry integration covers
   text/object/embed/rerank but not `transcribe()`, so `callGroqWhisperStt`
   opens its own generation observation. It records no token usage on purpose:
   Whisper bills by audio duration, which the response does not return, and a
   made-up token count would corrupt the roll-up.

### Cost figures

Langfuse infers cost from `model` + token usage against its model price list.
Two gaps to close in **Project Settings → Models** before the cost column is
trustworthy:

- `gemini-3.5-flash` / `gemini-3.5-flash-lite` — add definitions with current
  Vertex per-token prices if they are not in Langfuse's defaults yet.
- `whisper-large-v3` — priced per second of audio, so it needs a custom
  definition (and a duration) to show cost at all. Until then voice traces show
  Gemini cost only.

Photos are **not** attached to traces (`recordInputs: false` on the
`ocr-vision` call) to keep every upload from being copied into Langfuse. Flip
it to `true` in `src/lib/extract-order.ts` when you are debugging a specific
misread and want the image next to the raw OCR text.

### Benchmarks in Langfuse

`npm run bench:extraction` boots tracing itself (it runs under `tsx`, so Next's
instrumentation hook never fires) and tags each run with its `--label`. Two runs
labelled differently are directly comparable in Langfuse by token spend and
latency, not just in `benchmark-results/*.json`:

```bash
npm run bench:extraction -- --label=flash --runs=3
```

### Demo logins

- Customer app: `Toko Bu Sari` / any password (pre-filled on the login screen)
- Admin console at `/admin`: password shown on the login screen in demo mode
