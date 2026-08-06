"use client";

import { useRouter } from "next/navigation";

export default function WingsAuthHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-3 border-b border-wings-line px-4 py-3.5">
      <button onClick={() => router.back()} aria-label="Kembali" className="text-xl text-wings-grey-dark">
        ‹
      </button>
      <h1 className="text-base font-medium text-foreground">{title}</h1>
    </header>
  );
}
