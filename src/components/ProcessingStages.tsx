"use client";

import { useEffect, useState } from "react";
import { useLang, type StringKey } from "@/lib/i18n";

/**
 * One line at a time while a voice note or photo is turned into an order.
 *
 * The stages name what the server genuinely does — Whisper then Gemini for a
 * voice note, Gemini vision then Gemini for a photo — but the endpoints answer
 * once, at the end, so there is no progress to read. The pacing below is an
 * estimate of each step, and the final line holds for as long as the request
 * takes, which keeps a slow or rate-limited upload from looking stuck.
 */
const SEQUENCES: Record<"voice" | "photo", StringKey[]> = {
  voice: ["stageListening", "stageWriting", "stageMatching", "stageTotalling"],
  photo: ["stageReading", "stageHandwriting", "stageMatching", "stageTotalling"],
};

/** How long each stage holds before the next one fades in. */
const HOLD_MS = [1000, 1100, 1300, 1700];

export default function ProcessingStages({ kind }: { kind: "voice" | "photo" }) {
  const { t } = useLang();
  const [step, setStep] = useState(0);

  const stages = SEQUENCES[kind];
  // One past the sequence means the request outlasted our estimate.
  const done = step >= stages.length;

  useEffect(() => {
    if (done) return;
    const timer = setTimeout(() => setStep((s) => s + 1), HOLD_MS[step]);
    return () => clearTimeout(timer);
  }, [step, done]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 flex min-h-6 items-center justify-center gap-2.5 text-sm text-wings-red"
    >
      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-wings-red/25 border-t-wings-red" />
      {/* Keyed so each stage remounts and replays the fade. */}
      <span key={step} className="wings-stage-line">
        {t(done ? "stageAlmost" : stages[step])}
      </span>
    </div>
  );
}
