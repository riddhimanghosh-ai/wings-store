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

/** Tool name -> the phrase a retailer sees. Unknown tools are dropped, not shown raw. */
const TOOL_LABELS: Record<string, StringKey> = {
  lookupOrders: "chatToolOrders",
  searchProducts: "chatToolProducts",
  listTopDiscounts: "chatToolDiscounts",
};

function sourceLabels(toolsUsed: string[] | undefined, t: (key: StringKey) => string) {
  if (!toolsUsed?.length) return [];
  const keys = [...new Set(toolsUsed.map((name) => TOOL_LABELS[name]).filter(Boolean))];
  return keys.map((key) => t(key as StringKey));
}

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
 * A bullet the assistant labelled, e.g. "**Ale-Ale Anggur:** Rp 1.000 — 8% off
 * at 50+". Tolerates the colon inside or outside the bold span, since the model
 * moves it around.
 */
const LABELLED_BULLET = /^\*\*(.+?):?\*\*:?\s*(.*)$/;

/** A fact that quantifies a deal ("8% off at 50+") rather than stating a price. */
const IS_DEAL = /%|\boff\b|\bdiskon\b/i;

/** "Rp 1.000" — the one fact that earns its own aligned column. */
const IS_PRICE = /^(rp|idr)\s?[\d.,]+$/i;

type Row = { label: string; price: string | null; deal: string | null; rest: string[] };

function parseRow(line: string): Row | null {
  const match = line.match(LABELLED_BULLET);
  if (!match) return null;

  const facts = match[2]
    .split(/\s+[—–]\s+|\s+-\s+/)
    .map((f) => f.trim())
    .filter(Boolean);

  return {
    label: match[1],
    price: facts.find((f) => IS_PRICE.test(f)) ?? null,
    deal: facts.find((f) => IS_DEAL.test(f)) ?? null,
    rest: facts.filter((f) => !IS_PRICE.test(f) && !IS_DEAL.test(f)),
  };
}

/**
 * A deal every row shares, or null. Wings discounts are set per category, so
 * "8% off at 50+" is routinely identical down the whole list — six rows each
 * carrying the same badge is six times the ink for one fact, and it crowds out
 * the names and prices that actually differ. When it is common to every row it
 * gets hoisted above the list and dropped from the rows.
 */
function sharedDeal(rows: Row[]) {
  if (rows.length < 2) return null;
  const first = rows[0].deal;
  if (!first) return null;
  return rows.every((r) => r.deal === first) ? first : null;
}

const DEAL_PILL =
  "rounded-full bg-wings-red/10 px-1.5 py-0.5 text-[11px] font-medium text-wings-red-dark";

/**
 * A labelled bullet as one dense line: name left, price right-aligned in its
 * own column so prices stack into a scannable column down the list.
 *
 * Deliberately not a card. Cards gave each of two short facts ~130px of height,
 * so six deals overflowed the panel and had to be scrolled — the information
 * was legible but the list was not.
 */
function LabelledRow({ row, hideDeal }: { row: Row; hideDeal: boolean }) {
  const deal = hideDeal ? null : row.deal;

  return (
    <li className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="min-w-0 flex-1 leading-snug">
        <span className="font-medium">{inline(row.label)}</span>
        {row.rest.length > 0 && (
          <span className="block text-[12px] leading-snug text-wings-grey-dark">
            {row.rest.map((f, i) => (
              <span key={i}>
                {i > 0 && " · "}
                {inline(f)}
              </span>
            ))}
          </span>
        )}
      </span>
      {(row.price || deal) && (
        <span className="flex shrink-0 items-baseline gap-1.5">
          {row.price && <span className="font-semibold tabular-nums">{row.price}</span>}
          {deal && <span className={DEAL_PILL}>{inline(deal)}</span>}
        </span>
      )}
    </li>
  );
}

/**
 * The assistant is prompted to emit only "- " bullets and **bold**, so a full
 * markdown parser would be overkill. Consecutive bullets become one list.
 *
 * Degrades on purpose: a bullet that is not "**Label:** facts" still renders as
 * an ordinary dotted line, so an unexpected shape is plain rather than broken.
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
    <div className="space-y-2">
      {blocks.map((block, i) => {
        if (block.type !== "ul") {
          return (
            <p key={i} className="leading-snug">
              {inline(block.lines[0])}
            </p>
          );
        }

        const parsed = block.lines.map((line) => ({ line, row: parseRow(line) }));
        const rows = parsed.map((p) => p.row).filter((r): r is Row => r !== null);
        const common = rows.length === parsed.length ? sharedDeal(rows) : null;

        return (
          <div key={i}>
            {common && (
              <p className="mb-1">
                <span className={DEAL_PILL}>{inline(common)} — all items</span>
              </p>
            )}
            <ul className="divide-y divide-wings-line/70 rounded-xl bg-wings-surface px-2.5 py-0.5">
              {parsed.map(({ line, row }, j) =>
                row ? (
                  <LabelledRow key={j} row={row} hideDeal={common !== null} />
                ) : (
                  <li key={j} className="flex gap-1.5 py-1.5">
                    <span aria-hidden className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
                    <span className="flex-1 leading-snug">{inline(line)}</span>
                  </li>
                )
              )}
            </ul>
          </div>
        );
      })}
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
                  {/* The assistant gets more width than the user: it carries the
                      product rows, and at 85% almost every deal line wrapped. */}
                  <div
                    className={`rounded-2xl px-3 py-2.5 text-sm ${
                      m.role === "user"
                        ? "max-w-[85%] bg-wings-red text-white"
                        : "max-w-[94%] bg-[#f1f1f1] text-foreground"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <RichText content={m.content} />
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                    {m.role === "assistant" && sourceLabels(m.toolsUsed, t).length > 0 && (
                      <p className="mt-2 border-t border-wings-line pt-1.5 text-[10px] text-wings-grey">
                        {sourceLabels(m.toolsUsed, t).join(" · ")} {t("chatChecked")}
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
