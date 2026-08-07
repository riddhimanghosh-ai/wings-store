"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatIdr } from "@/lib/format";
import { discountInfo } from "@/lib/discount";
import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

type OrderItem = {
  id: string;
  productId: string | null;
  rawProductName: string;
  quantity: number;
  unit: string;
};

type Order = {
  id: string;
  sourceType: string;
  status: string;
  rawText: string;
  detectedLanguage: string | null;
  orderDate: string | null;
  notes: string | null;
  items: OrderItem[];
};

type Product = {
  id: string;
  name: string;
  unit: string;
  priceIdr: number;
  discountMinQty: number | null;
  discountPercent: number | null;
};

type DraftItem = {
  key: string;
  id?: string;
  productId: string;
  quantity: number;
  rawProductName: string;
};

const SOURCE_KEYS: Record<string, "viaVoice" | "viaPhoto" | "viaApps"> = {
  voice: "viaVoice",
  photo: "viaPhoto",
  manual: "viaApps",
};
const SOURCE_ICON: Record<string, string> = { voice: "🎤", photo: "📷", manual: "🛒" };

let draftKeyCounter = 0;
function nextKey() {
  draftKeyCounter += 1;
  return `konfirmasi-${draftKeyCounter}`;
}

export default function KonfirmasiPesananPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLang();

  const [order, setOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<DraftItem[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("not found");
        return res.json();
      })
      .then((data: { order: Order }) => {
        setOrder(data.order);
        setItems(
          data.order.items.map((i: OrderItem) => ({
            key: nextKey(),
            id: i.id,
            productId: i.productId ?? "",
            quantity: i.quantity,
            rawProductName: i.rawProductName,
          }))
        );
      })
      .catch(() => setNotFound(true));

    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.products));
  }, [params.id]);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const lines = useMemo(() => {
    if (!items) return [];
    return items.map((item) => {
      const product = productsById.get(item.productId);
      const info = product ? discountInfo(product, item.quantity) : null;
      const unitPrice = product
        ? info?.eligible
          ? Math.round(product.priceIdr * (1 - info.percent / 100))
          : product.priceIdr
        : null;
      return { item, product, info, unitPrice, subtotal: unitPrice != null ? unitPrice * item.quantity : null };
    });
  }, [items, productsById]);

  const total = lines.reduce((sum, l) => sum + (l.subtotal ?? 0), 0);
  const hasPricing = lines.some((l) => l.unitPrice != null);

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev?.map((it) => (it.key === key ? { ...it, ...patch } : it)) ?? prev);
  }

  function removeItem(key: string) {
    setItems((prev) => prev?.filter((it) => it.key !== key) ?? prev);
  }

  function addItem() {
    setItems((prev) => [
      ...(prev ?? []),
      { key: nextKey(), productId: "", quantity: 1, rawProductName: "" },
    ]);
  }

  async function confirmOrder() {
    if (!items || !order) return;
    if (items.length === 0) {
      setError(t("addItemOrDelete"));
      return;
    }
    if (items.some((i) => !i.productId)) {
      setError(t("selectProductOrRemove"));
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderDate: order.orderDate,
        notes: order.notes,
        items: items.map((i) => ({ id: i.id, productId: i.productId, quantity: i.quantity })),
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? t("confirmOrderFailed"));
      return;
    }

    router.push("/pembelian?baru=1");
  }

  async function deleteOrder() {
    if (!order) return;
    if (!confirm(t("deleteOrderConfirm"))) return;

    setDeleting(true);
    const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? t("deleteOrderFailed"));
      return;
    }

    router.push("/pesan-cepat");
  }

  if (notFound) {
    return (
      <main className="px-6 py-16 text-center">
        <p className="text-sm text-wings-grey">{t("orderNotFound")}</p>
      </main>
    );
  }

  if (!order || !items) {
    return <main className="px-6 py-16 text-center text-sm text-wings-grey">{t("loadingYourOrder")}</main>;
  }

  return (
    <div>
      <header className="flex items-center justify-between bg-wings-red px-4 py-3.5">
        <span className="w-14" />
        <h1 className="text-base font-semibold text-white">{t("confirmOrderTitle")}</h1>
        <LangToggle onRed />
      </header>

      <div className="px-4 py-4">
        <p className="mb-4 text-sm text-wings-grey-dark">{t("confirmOrderIntro")}</p>

        <div className="mb-4 rounded-lg border border-wings-line bg-wings-surface p-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-foreground">
              {SOURCE_ICON[order.sourceType] ?? ""} {t(SOURCE_KEYS[order.sourceType] ?? "viaApps")}
            </span>
            {order.detectedLanguage && (
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-wings-grey">
                {order.detectedLanguage}
              </span>
            )}
          </div>

          {order.rawText && (
            <button
              onClick={() => setShowTranscript((v) => !v)}
              className="text-xs text-wings-red hover:underline"
            >
              {showTranscript ? t("hideTranscript") : t("showTranscript")}
            </button>
          )}
          {showTranscript && (
            <pre className="mt-2 whitespace-pre-wrap rounded bg-background p-2 text-xs text-foreground">
              {order.rawText}
            </pre>
          )}
        </div>

        <div className="space-y-3">
          {lines.map(({ item, product, info, subtotal }) => (
            <div key={item.key} className="rounded-lg border border-wings-line bg-wings-surface p-3">
              <select
                value={item.productId}
                onChange={(e) => updateItem(item.key, { productId: e.target.value })}
                className="w-full rounded border border-wings-line px-2 py-1.5 text-sm outline-none focus:border-wings-red"
              >
                <option value="">—</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.key, { quantity: Number(e.target.value) || 1 })}
                  className="w-16 rounded border border-wings-line px-2 py-1.5 text-sm outline-none focus:border-wings-red"
                />
                <span className="text-xs text-wings-grey">{product?.unit ?? ""}</span>
                <button
                  onClick={() => removeItem(item.key)}
                  className="ml-auto text-xs font-medium text-wings-red hover:underline"
                >
                  {t("remove")}
                </button>
              </div>

              {!item.productId && (
                <p className="mt-1.5 text-xs italic text-wings-orange">
                  {t("rawTextLabel")}: &ldquo;{item.rawProductName}&rdquo;
                </p>
              )}

              {info && (
                <p className="mt-1.5 text-xs">
                  {info.eligible ? (
                    <span className="text-green-700">
                      ✓ {info.percent}% {t("discountApplied")}
                    </span>
                  ) : (
                    <span className="text-wings-orange">
                      {t("discountAddMore")} {info.remaining} {product?.unit ?? ""}{" "}
                      {t("discountMoreFor")} {info.percent}% {t("discountOff")} {info.minQty}
                    </span>
                  )}
                </p>
              )}

              {subtotal != null && (
                <p className="mt-1 text-right text-sm font-semibold text-foreground">
                  {formatIdr(subtotal)}
                </p>
              )}
            </div>
          ))}
        </div>

        <button onClick={addItem} className="mt-3 text-sm font-medium text-wings-red hover:underline">
          + {t("addItemBtn")}
        </button>

        {hasPricing && (
          <div className="mt-4 flex items-center justify-between rounded-lg border border-wings-line bg-wings-surface p-4 text-base font-semibold text-foreground">
            <span>{t("totalLabel")}</span>
            <span>{formatIdr(total)}</span>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-wings-red">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            onClick={deleteOrder}
            disabled={deleting || saving}
            className="rounded border border-wings-red px-4 py-2.5 text-sm font-medium text-wings-red disabled:opacity-50"
          >
            {deleting ? t("deletingOrder") : t("deleteOrderBtn")}
          </button>
          <button
            onClick={confirmOrder}
            disabled={saving || deleting}
            className="flex-1 rounded bg-wings-red py-2.5 text-sm font-semibold text-white hover:bg-wings-red-dark disabled:opacity-50"
          >
            {saving ? t("confirming") : t("confirmOrderBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
