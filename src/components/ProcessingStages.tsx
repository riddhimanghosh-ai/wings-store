"use client";

import { useEffect, useState } from "react";
import { useLang, type StringKey } from "@/lib/i18n";

/**
 * One line at a time while a voice note or photo is turned into an order.
 *
 * The stages name what the server genuinely does, in order: store the upload,
 * read it (Whisper for a voice note, Gemini vision for a photo), extract and
 * match the items, price them against the bulk discounts, then flag anything
 * that needs review. The endpoints answer once, at the end, so there is no
 * real progress to read — the pacing is an estimate, and TAIL keeps the line
 * moving for as long as the request runs past it.
 */
const SEQUENCES: Record<"voice" | "photo", StringKey[]> = {
  voice: [
    "stageSavingVoice",
    "stageListening",
    "stageWriting",
    "stageMatching",
    "stagePricing",
    "stageTotalling",
    "stageChecking",
  ],
  photo: [
    "stageSavingPhoto",
    "stageReading",
    "stageHandwriting",
    "stageMatching",
    "stagePricing",
    "stageTotalling",
    "stageChecking",
  ],
};

/**
 * Alternated once the sequence runs out, so an upload that outlasts our
 * estimate keeps moving instead of freezing on one line.
 */
const TAIL: StringKey[] = ["stageAlmost", "stageFinishing"];

/** How long each line holds before the next one fades in. */
const HOLD_MS = 2000;

export default function ProcessingStages({ kind }: { kind: "voice" | "photo" }) {
  const { t } = useLang();
  const [step, setStep] = useState(0);

  const stages = SEQUENCES[kind];
  // Past the sequence, fall through to the alternating tail.
  const overrun = step - stages.length;
  const line = overrun < 0 ? stages[step] : TAIL[overrun % TAIL.length];

  useEffect(() => {
    const timer = setTimeout(() => setStep((s) => s + 1), HOLD_MS);
    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 flex min-h-6 items-center justify-center gap-2.5 text-sm text-wings-red"
    >
      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-wings-red/25 border-t-wings-red" />
      {/* Keyed so each stage remounts and replays the fade. */}
      <span key={step} className="wings-stage-line">
        {t(line)}
      </span>
    </div>
  );
}
