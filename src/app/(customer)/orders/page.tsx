"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatIdr } from "@/lib/format";
import { discountInfo } from "@/lib/discount";
import { dateGroupLabel } from "@/lib/date-groups";
import { useProfile } from "@/lib/use-profile";
import DeliveryStepper from "@/components/DeliveryStepper";

type OrderItem = {
  id: string;
  rawProductName: string;
  productId: string | null;
  productName: string | null;
  productBrand: string | null;
  quantity: number;
  unit: string;
  matchConfidence: string | null;
  unitPriceIdr: number | null;
  appliedDiscountPercent: number | null;
};

type Order = {
  id: string;
  sourceType: string;
  status: string;
  deliveryStatus: string;
  customerName: string | null;
  storeName: string | null;
  orderDate: string | null;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
};

type Product = {
  id: string;
  name: string;
  unit: string;
  discountMinQty: number | null;
  discountPercent: number | null;
};

type DraftItem = { key: string; id?: string; productId: string; quantity: number };
type Draft = { orderDate: string; notes: string; items: DraftItem[] };

const SOURCE_LABELS: Record<string, string> = {
  voice: "🎤 Voice note",
  photo: "📷 Photo note",
  manual: "🛒 Manual PO",
};

const DELIVERY_LABELS: Record<string, string> = {
  placed: "Order placed",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const CANCELLABLE = ["placed", "packed"];

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "needs_review", label: "Needs review" },
  { key: "active", label: "In progress" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
] as const;

let draftKeyCounter = 0;
function nextKey() {
  draftKeyCounter += 1;
  return `draft-${draftKeyCounter}`;
}

function toDraft(order: Order): Draft {
  return {
    orderDate: order.orderDate ?? "",
    notes: order.notes ?? "",
    items: order.items.map((i) => ({
      key: nextKey(),
      id: i.id,
      productId: i.productId ?? "",
      quantity: i.quantity,
    })),
  };
}

function OrdersPageInner() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const { profile, ready } = useProfile();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  function load() {
    const url = profile ? `/api/orders?customerId=${profile.id}` : "/api/orders";
    fetch(url)
      .then((res) => res.json())
      .then((data) => setOrders(data.orders));
  }

  useEffect(() => {
    if (!ready) return;
    load();
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.products));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, profile?.id]);

  useEffect(() => {
    if (!orders || !focusId) return;
    const el = cardRefs.current.get(focusId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightId(focusId);
      const timer = setTimeout(() => setHighlightId(null), 2500);
      return () => clearTimeout(timer);
    }
  }, [orders, focusId]);

  const visible = useMemo(() => {
    if (!orders) return [];
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (sourceFilter !== "all" && o.sourceType !== sourceFilter) return false;

      if (tab === "needs_review" && o.status !== "needs_review") return false;
      if (tab === "delivered" && o.deliveryStatus !== "delivered") return false;
      if (tab === "cancelled" && o.deliveryStatus !== "cancelled") return false;
      if (
        tab === "active" &&
        (o.deliveryStatus === "delivered" || o.deliveryStatus === "cancelled")
      )
        return false;

      if (term) {
        const haystack = o.items
          .map((i) => `${i.productName ?? i.rawProductName} ${i.productBrand ?? ""}`)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [orders, tab, sourceFilter, search]);

  const groups = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const o of visible) {
      const label = dateGroupLabel(o.createdAt);
      const list = map.get(label) ?? [];
      list.push(o);
      map.set(label, list);
    }
    return Array.from(map.entries()).map(([label, list]) => ({
      label,
      orders: [...list].sort((a, b) => {
        const aPending = a.status === "needs_review" && a.deliveryStatus !== "cancelled";
        const bPending = b.status === "needs_review" && b.deliveryStatus !== "cancelled";
        if (aPending && !bPending) return -1;
        if (!aPending && bPending) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    }));
  }, [visible]);

  const pendingCount =
    orders?.filter((o) => o.status === "needs_review" && o.deliveryStatus !== "cancelled")
      .length ?? 0;
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  function startEdit(order: Order) {
    setEditingId(order.id);
    setDraft(toDraft(order));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
    setError(null);
  }

  function updateDraftItem(key: string, patch: Partial<DraftItem>) {
    setDraft((prev) =>
      prev
        ? { ...prev, items: prev.items.map((it) => (it.key === key ? { ...it, ...patch } : it)) }
        : prev
    );
  }

  async function saveEdit() {
    if (!draft || !editingId) return;
    if (draft.items.length === 0) return setError("Add at least one item.");
    if (draft.items.some((i) => !i.productId))
      return setError("Select a product for every item, or remove it.");

    setSaving(true);
    setError(null);
    const res = await fetch(`/api/orders/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderDate: draft.orderDate || null,
        notes: draft.notes || null,
        items: draft.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          quantity: i.quantity,
        })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return setError(body.error ?? "Failed to save changes");
    }
    cancelEdit();
    load();
  }

  async function approveOrder(id: string) {
    setBusyId(id);
    await fetch(`/api/orders/${id}/approve`, { method: "POST" });
    setBusyId(null);
    load();
  }

  async function cancelOrder(id: string) {
    if (!confirm("Cancel this order? This can't be undone.")) return;
    setBusyId(id);
    setActionError(null);
    const res = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? "Could not cancel this order.");
    }
    load();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-1 text-lg font-semibold text-brand-navy">My orders</h1>
      <p className="mb-4 text-xs text-brand-muted">
        {profile ? `Showing orders for ${profile.storeName}` : "Showing all demo orders"}
      </p>

      {pendingCount > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{pendingCount}</strong> order{pendingCount !== 1 ? "s" : ""} need
          {pendingCount === 1 ? "s" : ""} your review — check the extracted items, then Approve or
          Edit.
        </div>
      )}

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
              tab === t.key
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-brand-border bg-brand-surface text-brand-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by product…"
          className="flex-1 rounded-full border border-brand-border bg-brand-surface px-4 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-full border border-brand-border bg-brand-surface px-3 py-2 text-xs text-foreground outline-none focus:border-brand-blue"
        >
          <option value="all">All sources</option>
          <option value="voice">Voice</option>
          <option value="photo">Photo</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {orders === null && (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-xl border border-brand-border bg-brand-surface"
            />
          ))}
        </div>
      )}

      {orders !== null && visible.length === 0 && (
        <p className="py-8 text-center text-sm text-brand-muted">
          {orders.length === 0
            ? "No orders yet. Use Quick order or Browse to place your first one."
            : "No orders match these filters."}
        </p>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label}>
            <h2 className="mb-3 text-sm font-semibold text-brand-muted">{group.label}</h2>
            <div className="space-y-4">
              {group.orders.map((order) => {
                const isEditing = editingId === order.id;
                const hasPricing = order.items.some((i) => i.unitPriceIdr != null);
                const total = order.items.reduce(
                  (sum, i) => sum + (i.unitPriceIdr ?? 0) * i.quantity,
                  0
                );
                const isHighlighted = highlightId === order.id;
                const needsReview = order.status === "needs_review";
                const canCancel = CANCELLABLE.includes(order.deliveryStatus);
                const isBusy = busyId === order.id;

                return (
                  <div
                    key={order.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(order.id, el);
                      else cardRefs.current.delete(order.id);
                    }}
                    className={`rounded-xl border bg-brand-surface p-4 transition-shadow ${
                      isHighlighted
                        ? "border-brand-blue ring-2 ring-brand-blue/40"
                        : "border-brand-border"
                    }`}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-brand-navy">
                        {SOURCE_LABELS[order.sourceType] ?? order.sourceType}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            needsReview
                              ? "bg-amber-100 text-amber-700"
                              : order.deliveryStatus === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {order.deliveryStatus === "cancelled"
                            ? "cancelled"
                            : order.status.replace("_", " ")}
                        </span>
                        {!isEditing && needsReview && order.deliveryStatus !== "cancelled" && (
                          <button
                            onClick={() => approveOrder(order.id)}
                            disabled={isBusy}
                            className="text-xs font-medium text-green-700 hover:underline disabled:opacity-50"
                          >
                            Approve
                          </button>
                        )}
                        {!isEditing && order.deliveryStatus !== "cancelled" && (
                          <button
                            onClick={() => startEdit(order)}
                            className="text-xs font-medium text-brand-blue hover:underline"
                          >
                            Edit
                          </button>
                        )}
                        {!isEditing && canCancel && (
                          <button
                            onClick={() => cancelOrder(order.id)}
                            disabled={isBusy}
                            className="text-xs font-medium text-brand-red hover:underline disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {!isEditing && (
                      <p className="mb-3 text-xs text-brand-muted">
                        {new Date(order.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {order.orderDate && ` · Order date: ${order.orderDate}`}
                        {!canCancel && order.deliveryStatus !== "cancelled" && (
                          <> · no longer cancellable ({DELIVERY_LABELS[order.deliveryStatus]})</>
                        )}
                      </p>
                    )}

                    {!isEditing && !needsReview && (
                      <div className="mb-3 overflow-x-auto">
                        <DeliveryStepper status={order.deliveryStatus} />
                      </div>
                    )}

                    {isEditing && draft ? (
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <label className="flex-1 text-xs font-medium text-brand-muted">
                            Order date
                            <input
                              type="date"
                              value={draft.orderDate}
                              onChange={(e) => setDraft({ ...draft, orderDate: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-brand-border px-2 py-1.5 text-sm outline-none focus:border-brand-blue"
                            />
                          </label>
                          <label className="flex-[2] text-xs font-medium text-brand-muted">
                            Notes
                            <input
                              value={draft.notes}
                              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                              className="mt-1 w-full rounded-lg border border-brand-border px-2 py-1.5 text-sm outline-none focus:border-brand-blue"
                            />
                          </label>
                        </div>

                        <div className="space-y-2">
                          {draft.items.map((item) => {
                            const product = productsById.get(item.productId);
                            return (
                              <div key={item.key} className="flex items-center gap-2">
                                <select
                                  value={item.productId}
                                  onChange={(e) =>
                                    updateDraftItem(item.key, { productId: e.target.value })
                                  }
                                  className="flex-1 rounded-lg border border-brand-border px-2 py-1.5 text-sm outline-none focus:border-brand-blue"
                                >
                                  <option value="">Select product…</option>
                                  {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateDraftItem(item.key, {
                                      quantity: Number(e.target.value) || 1,
                                    })
                                  }
                                  className="w-16 rounded-lg border border-brand-border px-2 py-1.5 text-sm outline-none focus:border-brand-blue"
                                />
                                <span className="w-14 text-xs text-brand-muted">
                                  {product?.unit ?? ""}
                                </span>
                                <button
                                  onClick={() =>
                                    setDraft((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            items: prev.items.filter((i) => i.key !== item.key),
                                          }
                                        : prev
                                    )
                                  }
                                  className="text-xs text-brand-red hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {draft.items.map((item) => {
                          const product = productsById.get(item.productId);
                          const info = product ? discountInfo(product, item.quantity) : null;
                          if (!info) return null;
                          return (
                            <p key={item.key} className="text-[11px] text-brand-muted">
                              {product?.name}:{" "}
                              {info.eligible ? (
                                <span className="text-green-700">
                                  ✓ {info.percent}% bulk discount applied
                                </span>
                              ) : (
                                <span className="text-brand-orange">
                                  Add {info.remaining} more for {info.percent}% off (min{" "}
                                  {info.minQty})
                                </span>
                              )}
                            </p>
                          );
                        })}

                        <button
                          onClick={() =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    items: [
                                      ...prev.items,
                                      { key: nextKey(), productId: "", quantity: 1 },
                                    ],
                                  }
                                : prev
                            )
                          }
                          className="text-xs font-medium text-brand-blue hover:underline"
                        >
                          + Add item
                        </button>

                        {error && <p className="text-xs text-brand-red">{error}</p>}

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={saveEdit}
                            disabled={saving}
                            className="rounded-lg bg-brand-navy px-4 py-1.5 text-xs font-medium text-white hover:bg-brand-navy-light disabled:opacity-50"
                          >
                            {saving ? "Saving…" : "Save changes"}
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-lg border border-brand-border px-4 py-1.5 text-xs font-medium text-brand-muted hover:bg-background"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ul className="divide-y divide-brand-border text-sm">
                          {order.items.map((item) => (
                            <li key={item.id} className="flex items-center justify-between py-1.5">
                              <span>
                                {item.productName ?? (
                                  <span title={`Raw text: ${item.rawProductName}`}>
                                    {item.rawProductName}{" "}
                                    <span className="text-brand-orange">(unmatched)</span>
                                  </span>
                                )}
                                <span className="text-brand-muted">
                                  {" "}
                                  × {item.quantity} {item.unit}
                                </span>
                                {item.appliedDiscountPercent && (
                                  <span className="ml-1.5 rounded-full bg-brand-orange/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-orange">
                                    −{item.appliedDiscountPercent}%
                                  </span>
                                )}
                              </span>
                              {item.unitPriceIdr != null && (
                                <span className="text-brand-muted">
                                  {formatIdr(item.unitPriceIdr * item.quantity)}
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>

                        {hasPricing && (
                          <div className="mt-2 flex items-center justify-between border-t border-brand-border pt-2 text-sm font-semibold text-brand-navy">
                            <span>Total</span>
                            <span>{formatIdr(total)}</span>
                          </div>
                        )}

                        {order.notes && (
                          <p className="mt-2 text-xs italic text-brand-muted">
                            Notes: {order.notes}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersPageInner />
    </Suspense>
  );
}
