"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/wings-session";

type Status = "idle" | "recording" | "uploading" | "error";

export default function PesanCepatPage() {
  const router = useRouter();
  const { session } = useSession();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(file: Blob, endpoint: "voice" | "photo", filename: string) {
    setStatus("uploading");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file, filename);
      if (session) {
        fd.append("customerId", session.id);
        fd.append("customerName", session.storeName);
      }

      const res = await fetch(`/api/orders/${endpoint}`, { method: "POST", body: fd });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Pesanan gagal diproses.");
      }
      router.push("/pembelian?baru=1");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    }
  }

  async function startRecording() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        submit(new Blob(chunksRef.current, { type: "audio/webm" }), "voice", "pesanan.webm");
      };
      recorderRef.current = rec;
      rec.start();
      setStatus("recording");
    } catch {
      setStatus("error");
      setError("Tidak dapat mengakses mikrofon. Mohon izinkan akses mikrofon.");
    }
  }

  const busy = status === "uploading";

  return (
    <div className="min-h-screen bg-wings-surface">
      <header className="flex items-center gap-3 bg-wings-red px-4 py-3.5">
        <button onClick={() => router.back()} aria-label="Kembali" className="text-xl text-white">
          ‹
        </button>
        <h1 className="text-base font-semibold text-white">Pesan Cepat</h1>
      </header>

      <div className="px-6 py-8 text-center">
        <p className="mb-1 text-base font-semibold text-foreground">
          Rekam suara atau foto nota tulis tangan
        </p>
        <p className="mb-8 text-sm text-wings-grey-dark">
          Bisa Bahasa Indonesia, Inggris, atau campuran. AI akan membaca produk dan jumlahnya.
        </p>

        <button
          onClick={status === "recording" ? () => recorderRef.current?.stop() : startRecording}
          disabled={busy}
          className={`mx-auto mb-3 flex h-24 w-24 items-center justify-center rounded-full text-4xl text-white shadow-lg disabled:opacity-50 ${
            status === "recording" ? "animate-pulse bg-wings-red-dark" : "bg-wings-red"
          }`}
        >
          🎤
        </button>
        <p className="mb-8 text-sm text-wings-grey-dark">
          {status === "recording" ? "Merekam… tekan untuk berhenti" : "Tekan untuk merekam pesanan"}
        </p>

        <div className="mb-8 flex items-center gap-3">
          <span className="h-px flex-1 bg-wings-line" />
          <span className="text-xs text-wings-grey">atau</span>
          <span className="h-px flex-1 bg-wings-line" />
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) submit(f, "photo", f.name);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy || status === "recording"}
          className="w-full border border-wings-red py-3 text-sm font-semibold text-wings-red disabled:opacity-40"
        >
          📷 Foto / Unggah Nota
        </button>

        {busy && (
          <p className="mt-6 text-sm text-wings-red">Memproses pesanan Anda dengan AI…</p>
        )}
        {error && <p className="mt-6 text-sm text-wings-red">{error}</p>}
      </div>

      <div className="mx-6 rounded border border-wings-line bg-[#fafafa] p-3 text-xs text-wings-grey-dark">
        <p className="mb-1 font-semibold text-foreground">Contoh ucapan</p>
        <p>&ldquo;Mie Sedap Goreng 10 dus, Mama Lemon Jeruk Nipis 20, Soklin Softener 10&rdquo;</p>
      </div>
    </div>
  );
}
