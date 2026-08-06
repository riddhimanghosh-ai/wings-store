"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { formatIdr } from "@/lib/format";
import { discountInfo } from "@/lib/discount";

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

const SOURCE_LABELS: Record<string, string> = {
  voice: "🎤 Voice note",
  photo: "📷 Photo note",
  manual: "🛒 Manual PO",
};

let draftKeyCounter = 0;
function nextKey() {
  draftKeyCounter += 1;
  return `review-${draftKeyCounter}`;
}

export default function ReviewOrderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

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
      setError("Add at least one item, or delete the whole order below.");
      return;
    }
    if (items.some((i) => !i.productId)) {
      setError("Select a product for every item, or remove it.");
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
      setError(body.error ?? "Failed to confirm order");
      return;
    }

    router.push(`/orders?focus=${order.id}`);
  }

  async function deleteOrder() {
    if (!order) return;
    if (!confirm("Discard this order? This can't be undone.")) return;

    setDeleting(true);
    const res = await fetch(`/api/orders/${order.id}`, { method: "DELETE" });
    setDeleting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Could not delete this order.");
      return;
    }

    router.push("/quick-order");
  }

  if (notFound) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-sm text-brand-muted">
          This order could not be found — it may already have been confirmed or removed.
        </p>
      </main>
    );
  }

  if (!order || !items) {
    return <main className="px-6 py-16 text-center text-sm text-brand-muted">Loading your order…</main>;
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold text-brand-navy">Confirm your order</h1>
      <p className="mb-4 text-sm text-brand-muted">
        Check the items below — fix anything the AI misread, or remove what doesn&apos;t belong.
      </p>

      <div className="mb-4 rounded-xl border border-brand-border bg-brand-surface p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-brand-navy">
            {SOURCE_LABELS[order.sourceType] ?? order.sourceType}
          </span>
          {order.detectedLanguage && (
            <span className="rounded-full bg-background px-2 py-0.5 text-xs text-brand-muted">
              {order.detectedLanguage}
            </span>
          )}
        </div>

        {order.rawText && (
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="text-xs text-brand-blue hover:underline"
          >
            {showTranscript ? "Hide" : "Show"} raw transcript
          </button>
        )}
        {showTranscript && (
          <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-background p-2 text-xs text-foreground">
            {order.rawText}
          </pre>
        )}
      </div>

      <div className="space-y-3">
        {lines.map(({ item, product, info, subtotal }) => (
          <div key={item.key} className="rounded-xl border border-brand-border bg-brand-surface p-3">
            <select
              value={item.productId}
              onChange={(e) => updateItem(item.key, { productId: e.target.value })}
              className="w-full rounded-lg border border-brand-border px-2 py-1.5 text-sm outline-none focus:border-brand-blue"
            >
              <option value="">Select product…</option>
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
                className="w-16 rounded-lg border border-brand-border px-2 py-1.5 text-sm outline-none focus:border-brand-blue"
              />
              <span className="text-xs text-brand-muted">{product?.unit ?? ""}</span>
              <button
                onClick={() => removeItem(item.key)}
                className="ml-auto text-xs font-medium text-brand-red hover:underline"
              >
                Remove
              </button>
            </div>

            {!item.productId && (
              <p className="mt-1.5 text-xs italic text-brand-orange">
                Raw text: “{item.rawProductName}”
              </p>
            )}

            {info && (
              <p className="mt-1.5 text-xs">
                {info.eligible ? (
                  <span className="text-green-700">✓ {info.percent}% bulk discount applied</span>
                ) : (
                  <span className="text-brand-orange">
                    Add {info.remaining} more for {info.percent}% off (min {info.minQty})
                  </span>
                )}
              </p>
            )}

            {subtotal != null && (
              <p className="mt-1 text-right text-sm font-semibold text-brand-navy">
                {formatIdr(subtotal)}
              </p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        className="mt-3 text-sm font-medium text-brand-blue hover:underline"
      >
        + Add item
      </button>

      {hasPricing && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface p-4 text-base font-semibold text-brand-navy">
          <span>Total</span>
          <span>{formatIdr(total)}</span>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-brand-red">{error}</p>}

      <div className="mt-5 flex gap-2">
        <button
          onClick={deleteOrder}
          disabled={deleting || saving}
          className="rounded-lg border border-brand-red px-4 py-2.5 text-sm font-medium text-brand-red disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete order"}
        </button>
        <button
          onClick={confirmOrder}
          disabled={saving || deleting}
          className="flex-1 rounded-lg bg-brand-navy py-2.5 text-sm font-semibold text-white hover:bg-brand-navy-light disabled:opacity-50"
        >
          {saving ? "Confirming…" : "Confirm order"}
        </button>
      </div>
    </main>
  );
}
