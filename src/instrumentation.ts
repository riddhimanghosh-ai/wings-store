/**
 * Next runs this once per server instance, before the first request. It is the
 * only place tracing is booted for the app; scripts/eval-extraction.ts boots the
 * same function itself because it runs outside Next.
 */
export async function register() {
  // The OpenTelemetry Node SDK has no edge-runtime build, and every AI call in
  // this app is server-side anyway.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startTelemetry } = await import("./lib/telemetry");
  await startTelemetry();
}
