"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/wings-cart";
import { useSession } from "@/lib/wings-session";
import {
  boxPriceFor,
  packSizeFor,
  rp,
  formatIndoDate,
  defaultDeliveryDate,
  toIsoDate,
} from "@/lib/wings-catalog";
import type { WingsProduct } from "@/components/ProductRow";
import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

export default function KeranjangPage() {
  const router = useRouter();
  const { session } = useSession();
  const { t } = useLang();
  const { cart, ready, setLine, removeLine, clear } = useCart();

  const [products, setProducts] = useState<WingsProduct[] | null>(null);
  const [deliveryDate, setDeliveryDate] = useState(() => defaultDeliveryDate());
  const [editingDate, setEditingDate] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products));
  }, []);

  const lines = useMemo(() => {
    if (!products) return [];
    return Object.entries(cart)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return null;
        const boxPrice = boxPriceFor(product);
        return {
          product,
          box: qty.box,
          pcs: qty.pcs,
          packSize: packSizeFor(product),
          subtotal: qty.box * boxPrice + qty.pcs * product.priceIdr,
          totalPieces: qty.box * packSizeFor(product) + qty.pcs,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [cart, products]);

  const subTotal = lines.reduce((s, l) => s + l.subtotal, 0);

  /** Mirrors the live app's "Hitung Harga Aktual": applies real bulk discounts. */
  const actualTotal = useMemo(() => {
    return lines.reduce((sum, l) => {
      const { product, totalPieces } = l;
      const eligible =
        product.discountMinQty != null &&
        product.discountPercent != null &&
        totalPieces >= product.discountMinQty;
      const unit = eligible
        ? Math.round(product.priceIdr * (1 - product.discountPercent! / 100))
        : product.priceIdr;
      return sum + unit * totalPieces;
    }, 0);
  }, [lines]);

  const discount = subTotal - actualTotal;

  async function submitOrder() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/orders/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: session?.id ?? null,
        customerName: session?.storeName ?? null,
        orderDate: toIsoDate(deliveryDate),
        items: lines.map((l) => ({ productId: l.product.id, quantity: l.totalPieces })),
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? t("orderFailed"));
      return;
    }

    clear();
    router.push("/pembelian?baru=1");
  }

  if (!ready) return <div className="min-h-screen bg-wings-surface" />;

  return (
    <div>
      <header className="bg-wings-red px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="w-14" />
          <h1 className="text-base font-semibold text-white">{t("cart")}</h1>
          <LangToggle onRed />
        </div>
      </header>

      {showBanner && (
        <div className="flex items-start gap-2 border-b border-wings-line bg-wings-surface px-4 py-2.5 text-xs text-wings-grey-dark">
          <span>ⓘ</span>
          <p className="flex-1">
            {t("productsNotShowing")} <span className="italic text-wings-red">{t("reloadHere")}</span>
          </p>
          <button onClick={() => setShowBanner(false)} aria-label="close" className="text-wings-grey">
            ✕
          </button>
        </div>
      )}

      <div className="bg-wings-surface px-4 py-3 text-sm">
        <p className="mb-2 text-wings-grey-dark">
          <span className="text-wings-red">📍</span> {t("deliverTo")}{" "}
          <span className="font-semibold text-foreground">
            {session?.storeName?.toUpperCase() ?? "—"}
          </span>
        </p>

        <div className="flex items-start justify-between gap-3">
          <p className="text-wings-grey-dark">
            {t("willShipOn")}{" "}
            <span className="font-semibold text-foreground">{formatIndoDate(deliveryDate)}</span>
          </p>
          <button
            onClick={() => setEditingDate((v) => !v)}
            className="shrink-0 whitespace-nowrap text-wings-red"
          >
            {t("changeDate")}
          </button>
        </div>

        {editingDate && (
          <input
            type="date"
            value={toIsoDate(deliveryDate)}
            min={toIsoDate(new Date())}
            onChange={(e) => {
              if (e.target.value) setDeliveryDate(new Date(`${e.target.value}T00:00:00`));
            }}
            className="mt-2 w-full border border-wings-line px-2 py-1.5 text-sm outline-none"
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between border-y border-wings-line bg-wings-surface px-4 py-2.5 text-sm">
        <span className="text-wings-grey-dark">{lines.length} {t("productCount")}</span>
        {lines.length > 0 && (
          <button onClick={clear} className="text-wings-red">
            {t("removeAll")}
          </button>
        )}
      </div>

      {lines.length === 0 && (
        <p className="bg-wings-surface px-4 py-10 text-center text-sm text-wings-grey">
          {t("cartEmpty")}
        </p>
      )}

      <div className="bg-wings-surface">
        {lines.map((l) => (
          <div key={l.product.id} className="border-b border-wings-line px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{l.product.name}</p>
                <p className="mt-0.5 text-[11px] text-wings-grey">
                  1 {t("perBox")} @ {l.packSize} {l.product.unit} · {l.totalPieces} {l.product.unit} {t("total")}
                </p>
              </div>
              <button
                onClick={() => removeLine(l.product.id)}
                className="text-xs text-wings-red"
              >
                {t("remove")}
              </button>
            </div>

            <div className="mt-2 flex items-center gap-4">
              <MiniStepper
                label="BOX"
                value={l.box}
                onChange={(box) => setLine(l.product.id, { box })}
              />
              <MiniStepper
                label="PCS"
                value={l.pcs}
                onChange={(pcs) => setLine(l.product.id, { pcs })}
              />
              <span className="ml-auto text-sm font-semibold">{rp(l.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between border-y border-wings-line bg-wings-surface px-4 py-3 text-sm">
        <span className="font-medium">{t("voucher")}</span>
        <span className="text-wings-grey">{t("vouchersAvailable")}</span>
      </div>

      <div className="mt-2 space-y-2 bg-wings-surface px-4 py-3 text-sm">
        <Row label={t("subTotalEst")} value={rp(subTotal)} />
        {/* Wings only reveals the real discount after "Hitung Harga Aktual" —
            before that the estimate carries no deduction. */}
        <Row label={t("deductionEst")} value={calculated ? `- ${rp(discount)}` : "- Rp 0"} />
        <Row
          label={t("productDiscount")}
          value={calculated && discount > 0 ? `- ${rp(discount)}` : "- Rp 0"}
          muted
        />
        <div className="border-t border-wings-line pt-2">
          <Row
            label={calculated ? t("totalPrice") : t("totalPriceEst")}
            value={rp(calculated ? actualTotal : subTotal)}
            bold
          />
        </div>
        <Row label={t("points")} value="0J 0Q 0K" muted />
        {calculated && (
          <p className="text-[11px] text-green-700">
            {discount > 0
              ? `${t("calcActual")}: ${rp(discount)}`
              : t("calcActual")}
          </p>
        )}
      </div>

      {error && <p className="px-4 py-2 text-sm text-wings-red">{error}</p>}

      <div className="flex gap-2 px-4 py-4">
        <button
          onClick={() => setCalculated(true)}
          disabled={lines.length === 0}
          className="flex-1 border border-wings-red py-3 text-sm font-medium leading-tight text-wings-red disabled:opacity-40"
        >
          {t("calcActual")}
        </button>
        <button
          onClick={submitOrder}
          disabled={lines.length === 0 || submitting}
          className="flex-1 bg-wings-red py-3 text-sm font-semibold text-white disabled:opacity-40"
        >
          {submitting ? t("processing") : t("orderNow")}
        </button>
      </div>

      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-8">
          <div className="w-full max-w-xs rounded-lg bg-white px-6 py-8 text-center">
            <div className="mb-4 text-5xl">🛒</div>
            <p className="text-lg font-semibold text-wings-red">{t("orderProcessed")}</p>
            <p className="mt-1.5 text-sm text-wings-grey-dark">
              {t("orderProcessedBody")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-wings-grey" : "text-wings-grey-dark"}>{label}</span>
      <span className={bold ? "text-base font-bold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}

function MiniStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label={`- ${label}`}
        className="h-6 w-6 border border-wings-line text-sm leading-none text-wings-grey-dark"
      >
        −
      </button>
      <span className="w-6 text-center text-sm">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        aria-label={`+ ${label}`}
        className="h-6 w-6 border border-wings-line text-sm leading-none text-wings-grey-dark"
      >
        +
      </button>
      <span className="rounded bg-[#37474f] px-1.5 py-0.5 text-[9px] font-semibold text-white">
        {label}
      </span>
    </div>
  );
}
