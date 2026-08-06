"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WingsAuthHeader from "@/components/WingsAuthHeader";
import { useLang } from "@/lib/i18n";

const QUESTION_KEYS = ["q1", "q2", "q3"] as const;

export default function PertanyaanKeamananPage() {
  const router = useRouter();
  const { t } = useLang();
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");

  const canSave = selected !== null && answer.trim().length > 0;

  return (
    <main className="min-h-screen bg-wings-surface">
      <WingsAuthHeader title={t("securityQuestion")} />

      <div className="px-5 pt-4">
        <p className="mb-1 text-sm text-wings-grey-dark">
          {t("securityIntro")}
        </p>
        <p className="mb-6 text-sm text-wings-grey-dark">
          {t("securityWarn")}
        </p>

        <div className="mb-6 space-y-4">
          {QUESTION_KEYS.map((qk) => (
            <label key={qk} className="flex items-start gap-3 text-sm">
              <input
                type="radio"
                name="security-question"
                checked={selected === qk}
                onChange={() => setSelected(qk)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-wings-red"
              />
              <span className="text-wings-grey-dark">{t(qk)}</span>
            </label>
          ))}
        </div>

        <label className="mb-8 block">
          <span className="mb-1 block text-sm text-foreground">{t("answer")}</span>
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="wings-underline-input"
          />
        </label>

        <button
          onClick={() => router.push("/lupa-password")}
          disabled={!canSave}
          className={`w-full py-3 text-base font-semibold tracking-wide text-white ${
            canSave ? "bg-wings-red hover:bg-wings-red-dark" : "bg-wings-disabled"
          }`}
        >
          {t("save")}
        </button>
      </div>
    </main>
  );
}
