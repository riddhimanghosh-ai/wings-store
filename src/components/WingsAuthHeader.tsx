"use client";

import { useRouter } from "next/navigation";
import LangToggle from "@/components/LangToggle";

export default function WingsAuthHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <header className="flex items-center gap-3 border-b border-wings-line px-4 py-3.5">
      <button onClick={() => router.back()} aria-label="Kembali" className="text-xl text-wings-grey-dark">
        ‹
      </button>
      <h1 className="flex-1 text-base font-medium text-foreground">{title}</h1>
      <LangToggle />
    </header>
  );
}
