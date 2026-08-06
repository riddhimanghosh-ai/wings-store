"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WingsAuthHeader from "@/components/WingsAuthHeader";
import { useLang } from "@/lib/i18n";

export default function LupaPasswordPage() {
  const router = useRouter();
  const { t } = useLang();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showA, setShowA] = useState(false);
  const [showB, setShowB] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReset = password.length > 0 && confirm.length > 0;

  function handleReset() {
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    router.push("/masuk");
  }

  return (
    <main className="min-h-screen bg-wings-surface">
      <WingsAuthHeader title={t("forgotPassword")} />

      <div className="px-5 pt-6">
        <div className="mb-8 flex items-end gap-3 border-b border-wings-line pb-1">
          <div className="flex-1">
            <span className="mb-1 block text-sm text-wings-grey">{t("newPassword")}</span>
            <input
              type={showA ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent py-1 text-base outline-none"
            />
          </div>
          <button onClick={() => setShowA((v) => !v)} aria-label={t("password")} className="pb-1 text-wings-grey">
            👁
          </button>
        </div>

        <div className="mb-8 flex items-end gap-3 border-b border-wings-line pb-1">
          <div className="flex-1">
            <span className="mb-1 block text-sm text-wings-grey">{t("repeatPassword")}</span>
            <input
              type={showB ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-transparent py-1 text-base outline-none"
            />
          </div>
          <button onClick={() => setShowB((v) => !v)} aria-label={t("password")} className="pb-1 text-wings-grey">
            👁
          </button>
        </div>

        {error && <p className="mb-4 text-sm text-wings-red">{error}</p>}

        <button
          onClick={handleReset}
          disabled={!canReset}
          className={`w-full py-3 text-base font-semibold tracking-wide text-white ${
            canReset ? "bg-wings-red hover:bg-wings-red-dark" : "bg-wings-disabled"
          }`}
        >
          {t("resetPassword")}
        </button>
      </div>
    </main>
  );
}
