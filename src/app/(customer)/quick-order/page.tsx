"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProfile } from "@/lib/use-profile";

type Status = "idle" | "recording" | "uploading" | "error";

export default function QuickOrderPage() {
  const router = useRouter();
  const { profile } = useProfile();
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submitFile(file: File | Blob, endpoint: "photo" | "voice", filename: string) {
    setStatus("uploading");
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file, filename);
      if (profile) {
        formData.append("customerId", profile.id);
        formData.append("customerName", profile.storeName);
      }

      const res = await fetch(`/api/orders/${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to process order");
      }

      const body = await res.json();
      router.push(`/review/${body.orderId}`);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function startRecording() {
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      submitFile(blob, "voice", "voice-note.webm");
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) submitFile(file, "photo", file.name);
  }

  const isBusy = status === "recording" || status === "uploading";

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center justify-center gap-8 px-6 py-12 text-center">
      <Link href="/" className="self-start text-sm text-brand-blue hover:underline">
        ← Back
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-brand-navy">Quick order</h1>
        <p className="mt-2 text-sm text-brand-muted">
          Record a voice note or take a photo of a handwritten order — English or Bahasa Indonesia.
        </p>
        <p className="mt-2 text-xs text-brand-muted">
          Ordering for{" "}
          <span className="font-medium text-brand-navy">
            {profile ? profile.storeName : "— select a store in the header"}
          </span>
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={status === "recording" ? stopRecording : startRecording}
          disabled={status === "uploading"}
          className={`h-20 w-20 rounded-full text-3xl text-white shadow-lg transition ${
            status === "recording" ? "bg-brand-red animate-pulse" : "bg-brand-navy hover:bg-brand-navy-light"
          } disabled:opacity-50`}
        >
          🎤
        </button>
        <p className="text-sm text-brand-muted">
          {status === "recording" ? "Recording… tap to stop" : "Tap to record a voice order"}
        </p>
      </div>

      <div className="flex w-full items-center gap-3 text-brand-border">
        <div className="h-px flex-1 bg-brand-border" />
        or
        <div className="h-px flex-1 bg-brand-border" />
      </div>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handlePhotoChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-navy/5 disabled:opacity-50"
        >
          📷 Take / upload photo of note
        </button>
      </div>

      {status === "uploading" && (
        <p className="text-sm text-brand-blue">Processing your order…</p>
      )}
      {error && <p className="text-sm text-brand-red">{error}</p>}
    </main>
  );
}
