"use client";

import { useEffect, useRef, useState } from "react";
import { useProfile } from "@/lib/use-profile";

type Msg = { role: "user" | "assistant"; content: string; toolsUsed?: string[] };

const SUGGESTIONS = [
  "Where is my order?",
  "Any discounts on Mie Sedaap?",
  "How do I cancel an order?",
  "Show me today's best deals",
];

export default function ChatWidget() {
  const { profile } = useProfile();
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
            ? body.reply || "Sorry, I didn't catch that."
            : body.error ?? "Something went wrong.",
          toolsUsed: body.toolsUsed,
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "Network error — please try again." },
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
          aria-label="Open support chat"
          className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-2xl text-white shadow-lg hover:bg-brand-red-dark"
        >
          💬
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="flex h-[85vh] w-full flex-col rounded-t-2xl bg-brand-surface sm:h-[600px] sm:max-w-md sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-brand-border px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-brand-navy">Wings Assistant</p>
                <p className="text-xs text-brand-muted">
                  {profile ? `Helping ${profile.storeName}` : "Orders, products & discounts"}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-sm text-brand-muted">
                Close
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div>
                  <p className="mb-3 text-sm text-brand-muted">
                    Hi{profile ? ` ${profile.contactName}` : ""} 👋 Ask me about your orders,
                    product prices, or current discounts.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-full border border-brand-border px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-background"
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
                        ? "bg-brand-navy text-white"
                        : "bg-background text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.toolsUsed && m.toolsUsed.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-brand-muted">
                        looked up: {Array.from(new Set(m.toolsUsed)).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-background px-3.5 py-2 text-sm text-brand-muted">
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex gap-2 border-t border-brand-border p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about orders, prices, discounts…"
                className="flex-1 rounded-full border border-brand-border px-4 py-2 text-sm outline-none focus:border-brand-blue"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-brand-navy px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
