"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WingsAuthHeader from "@/components/WingsAuthHeader";

const QUESTIONS = [
  "Siapa nama kecil saya ?",
  "Dimana saya sekolah pertama kali ?",
  "Di kota manakah saya dilahirkan ?",
];

export default function PertanyaanKeamananPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");

  const canSave = selected !== null && answer.trim().length > 0;

  return (
    <main className="min-h-screen bg-wings-surface">
      <WingsAuthHeader title="Pertanyaan Keamanan" />

      <div className="px-5 pt-4">
        <p className="mb-1 text-sm text-wings-grey-dark">
          Pilih salah satu pertanyaan keamanan yang akan menjadi verifikasi akun Anda.
        </p>
        <p className="mb-6 text-sm text-wings-grey-dark">
          *Pastikan Anda mengingat pertanyaan dan jawaban yang Anda berikan sebelum menekan tombol
          simpan
        </p>

        <div className="mb-6 space-y-4">
          {QUESTIONS.map((q) => (
            <label key={q} className="flex items-start gap-3 text-sm">
              <input
                type="radio"
                name="security-question"
                checked={selected === q}
                onChange={() => setSelected(q)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-wings-red"
              />
              <span className="text-wings-grey-dark">{q}</span>
            </label>
          ))}
        </div>

        <label className="mb-8 block">
          <span className="mb-1 block text-sm text-foreground">Jawaban:</span>
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
          SIMPAN
        </button>
      </div>
    </main>
  );
}
