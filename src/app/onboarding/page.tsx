"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markOnboarded } from "@/lib/wings-session";

const SLIDES = [
  {
    title: "Order dari Kategori",
    body: "Klik salah satu kategori pada beranda",
    art: "grid",
  },
  {
    title: "Order dari Pencarian",
    body: "Cari produk lewat kolom pencarian di beranda",
    art: "search",
  },
  {
    title: "Order dari Suara & Foto",
    body: "Rekam pesanan atau foto nota tulis tangan — AI akan membacanya",
    art: "voice",
  },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];
  const isLast = index === SLIDES.length - 1;

  function finish() {
    markOnboarded();
    router.push("/");
  }

  return (
    <main className="flex min-h-screen flex-col bg-wings-surface">
      <div className="flex items-center justify-between px-4 py-3.5">
        <button
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          aria-label="Kembali"
          className="text-xl text-wings-grey-dark disabled:opacity-30"
        >
          ‹
        </button>
        <button onClick={finish} className="text-sm text-wings-grey-dark">
          Lewati
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <OnboardingArt kind={slide.art} />

        <h1 className="mt-8 text-center text-3xl font-bold leading-tight text-wings-red">
          {slide.title}
        </h1>
        <p className="mt-3 text-center text-base text-wings-grey-dark">{slide.body}</p>

        <div className="mt-8 flex gap-2">
          {SLIDES.map((s, i) => (
            <span
              key={s.title}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-wings-red" : "w-2 bg-wings-line"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-5">
        <button
          onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
          className="w-full bg-wings-red py-3.5 text-base font-semibold tracking-wide text-white hover:bg-wings-red-dark"
        >
          {isLast ? "MULAI" : "LANJUT"}
        </button>
      </div>
    </main>
  );
}

function OnboardingArt({ kind }: { kind: "grid" | "search" | "voice" }) {
  return (
    <div className="relative flex h-52 w-44 items-center justify-center rounded-xl border border-wings-line bg-[#fafafa] p-3">
      <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-xl bg-wings-red/10" />
      {kind === "grid" && (
        <div className="grid w-full grid-cols-3 gap-1.5">
          {["#c9a978", "#f5a623", "#ef7f5c", "#2f2f2f", "#3d9fe0", "#e2599b", "#4a86d4", "#35bfc7", "#34bfa0"].map(
            (c) => (
              <div key={c} className="aspect-square rounded" style={{ background: c }} />
            )
          )}
        </div>
      )}
      {kind === "search" && (
        <div className="w-full space-y-2">
          <div className="flex items-center gap-1.5 rounded border border-wings-line bg-white px-2 py-1.5">
            <span className="text-[10px]">🔍</span>
            <div className="h-1.5 w-16 rounded bg-wings-line" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-2 rounded border border-wings-line bg-white p-1.5">
              <div className="h-8 w-8 rounded bg-wings-line" />
              <div className="flex-1 space-y-1 pt-1">
                <div className="h-1.5 w-full rounded bg-wings-line" />
                <div className="h-1.5 w-2/3 rounded bg-wings-line" />
              </div>
            </div>
          ))}
        </div>
      )}
      {kind === "voice" && (
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-wings-red text-2xl text-white">
            🎤
          </div>
          <div className="flex items-end gap-1">
            {[10, 18, 26, 16, 22, 12].map((h, i) => (
              <span key={i} className="w-1.5 rounded-full bg-wings-red/60" style={{ height: h }} />
            ))}
          </div>
          <span className="text-3xl">📝</span>
        </div>
      )}
    </div>
  );
}
