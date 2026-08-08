"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/lib/wings-session";
import { useLang, type StringKey } from "@/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string; toolsUsed?: string[] };

const SUGGESTION_KEYS: StringKey[] = [
  "chatSuggest1",
  "chatSuggest2",
  "chatSuggest3",
  "chatSuggest4",
];

/** Renders the **bold** spans the assistant is allowed to emit. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      part
    )
  );
}

/**
 * The assistant is prompted to emit only "- " bullets and **bold**, so a full
 * markdown parser would be overkill. Consecutive bullets become one list.
 */
function RichText({ content }: { content: string }) {
  const blocks: Array<{ type: "p" | "ul"; lines: string[] }> = [];

  for (const raw of content.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const isBullet = line.startsWith("- ");
    const body = isBullet ? line.slice(2).trim() : line;
    const last = blocks[blocks.length - 1];

    if (isBullet && last?.type === "ul") last.lines.push(body);
    else blocks.push({ type: isBullet ? "ul" : "p", lines: [body] });
  }

  return (
    <div className="space-y-1.5">
      {blocks.map((block, i) =>
        block.type === "ul" ? (
          <ul key={i} className="space-y-1">
            {block.lines.map((line, j) => (
              <li key={j} className="flex gap-1.5">
                <span aria-hidden className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
                <span className="flex-1">{inline(line)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>{inline(block.lines[0])}</p>
        )
      )}
    </div>
  );
}

export default function ChatWidget() {
  const { session: profile } = useSession();
  const { lang, t } = useLang();
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
          lang,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const body = await res.json();

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: res.ok ? body.reply || t("chatNoCatch") : body.error ?? t("chatError"),
          toolsUsed: body.toolsUsed,
        },
      ]);
    } catch {
      setMessages([...nextMessages, { role: "assistant", content: t("chatNetworkError") }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t("chatOpenAria")}
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
                <p className="text-sm font-semibold text-foreground">{t("chatTitle")}</p>
                <p className="text-xs text-wings-grey">
                  {profile ? `${t("chatHelping")} ${profile.storeName}` : t("chatScope")}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-sm text-wings-grey">
                {t("chatClose")}
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div>
                  <p className="mb-3 text-sm text-wings-grey">
                    {t("chatGreeting")}
                    {profile ? ` ${profile.contactName}` : ""} 👋 {t("chatGreetingHint")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTION_KEYS.map((key) => (
                      <button
                        key={key}
                        onClick={() => send(t(key))}
                        className="rounded-full border border-wings-line px-3 py-1.5 text-xs font-medium text-foreground hover:bg-[#f1f1f1]"
                      >
                        {t(key)}
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
                    {m.role === "assistant" ? (
                      <RichText content={m.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                    {m.toolsUsed && m.toolsUsed.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-wings-grey">
                        {t("chatChecked")}: {Array.from(new Set(m.toolsUsed)).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-[#f1f1f1] px-3.5 py-2 text-sm text-wings-grey">
                    {t("chatTyping")}
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
                placeholder={t("chatPlaceholder")}
                className="flex-1 rounded-full border border-wings-line px-4 py-2 text-sm outline-none focus:border-wings-red"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="rounded-full bg-wings-red px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {t("chatSend")}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
