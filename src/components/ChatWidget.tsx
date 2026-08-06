"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/wings-session";

type Msg = { role: "user" | "assistant"; content: string; toolsUsed?: string[] };

const SUGGESTIONS = [
  "Di mana pesanan saya?",
  "Ada diskon Mie Sedaap?",
  "Bagaimana cara membatalkan order?",
  "Promo terbaik hari ini",
];

export default function ChatWidget() {
  const { session: profile } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: profile?.id ?? null,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const body = await res.json();

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: res.ok
            ? body.reply || "Maaf, saya tidak menangkap itu."
            : body.error ?? "Terjadi kesalahan.",
          toolsUsed: body.toolsUsed,
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "Gangguan jaringan — silakan coba lagi." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Buka bantuan"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-wings-red text-2xl text-white shadow-lg hover:bg-wings-red-dark"
        >
          💬
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="flex h-[85vh] w-full flex-col rounded-t-2xl bg-wings-surface sm:h-[600px] sm:max-w-md sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-wings-line px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Asisten Wings</p>
                <p className="text-xs text-wings-grey">
                  {profile ? `Membantu ${profile.storeName}` : "Pesanan, produk & promo"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-sm text-wings-grey">
                Tutup
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div>
                  <p className="mb-3 text-sm text-wings-grey">
                    Halo{profile ? ` ${profile.contactName}` : ""} 👋 Tanya soal pesanan, harga produk,
                    atau promo yang sedang berjalan.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-wings-line px-3 py-1.5 text-xs font-medium text-foreground hover:bg-[#f1f1f1]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-wings-red text-white"
                        : "bg-[#f1f1f1] text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.toolsUsed && m.toolsUsed.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-wings-grey">
                        dicek: {Array.from(new Set(m.toolsUsed)).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-[#f1f1f1] px-3.5 py-2 text-sm text-wings-grey">
                    Sedang mengetik…
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2 border-t border-wings-line p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tanya pesanan, harga, promo…"
                className="flex-1 rounded-full border border-wings-line px-4 py-2 text-sm outline-none focus:border-wings-red"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-wings-red px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Kirim
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
