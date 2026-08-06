"use client";

import { useLang } from "@/lib/i18n";

/**
 * ID / EN switch. `onRed` renders the light-on-red variant used inside the
 * Wings red headers; the default suits light surfaces.
 */
export default function LangToggle({ onRed = false }: { onRed?: boolean }) {
  const { lang, setLang } = useLang();

  // Tall enough to be a comfortable tap target on a phone — at 20px high the
  // labels were easy to miss.
  const base =
    "flex min-w-11 items-center justify-center px-3 py-2 text-xs font-bold leading-none tracking-wide transition";
  const activeCls = onRed ? "bg-white text-wings-red" : "bg-wings-red text-white";
  const idleCls = onRed ? "text-white" : "text-wings-grey-dark";

  return (
    <div
      className={`flex overflow-hidden rounded-full border ${
        onRed ? "border-white/50" : "border-wings-line"
      }`}
      role="group"
      aria-label="Language"
    >
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`${base} ${lang === l ? activeCls : idleCls}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
