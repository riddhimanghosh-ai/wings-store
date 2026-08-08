"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatIdr } from "@/lib/format";
import { DELIVERY_STAGES, nextDeliveryStatus } from "@/lib/delivery";
import MediaPreview from "@/components/MediaPreview";

type OrderItem = {
  id: string;
  rawProductName: string;
  productName: string | null;
  productBrand: string | null;
  quantity: number;
  unit: string;
  unitPriceIdr: number | null;
  appliedDiscountPercent: number | null;
};

type Order = {
  id: string;
  sourceType: string;
  status: string;
  deliveryStatus: string;
  customerId: string | null;
  customerName: string | null;
  storeName: string | null;
  contactName: string | null;
  customerPhone: string | null;
  customerCity: string | null;
  rawText: string;
  mediaUrl: string | null;
  detectedLanguage: string | null;
  orderDate: string | null;
  notes: string | null;
  extractionModel: string | null;
  extractionTokens: number | null;
  extractionMs: number | null;
  createdAt: string;
  items: OrderItem[];
};

const SOURCE_LABELS: Record<string, string> = {
  voice: "🎤 Voice",
  photo: "📷 Photo",
  manual: "🛒 Manual",
};

const DELIVERY_LABELS: Record<string, string> = {
  placed: "Order placed",
  packed: "Packed",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const CANCELLABLE = ["placed", "packed"];

function AdminOrdersInner() {
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<Order[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deliveryFilter, setDeliveryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState(searchParams.get("customer") ?? "all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function load() {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data.orders));
  }

  useEffect(load, []);

  const customerOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders ?? []) {
      if (o.customerId) map.set(o.customerId, o.storeName ?? o.customerName ?? "Unknown store");
    }
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [orders]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const term = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (deliveryFilter !== "all" && o.deliveryStatus !== deliveryFilter) return false;
      if (sourceFilter !== "all" && o.sourceType !== sourceFilter) return false;
      if (customerFilter === "unassigned" && o.customerId) return false;
      if (customerFilter !== "all" && customerFilter !== "unassigned" && o.customerId !== customerFilter)
        return false;
      if (term) {
        const haystack = [
          o.storeName,
          o.contactName,
          o.customerName,
          o.customerPhone,
          o.rawText,
          ...o.items.map((i) => `${i.productName ?? i.rawProductName} ${i.productBrand ?? ""}`),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, deliveryFilter, sourceFilter, customerFilter, search]);

  const stats = useMemo(() => {
    const revenue = filtered.reduce(
      (sum, o) => sum + o.items.reduce((s, i) => s + (i.unitPriceIdr ?? 0) * i.quantity, 0),
      0
    );
    return {
      total: filtered.length,
      needsReview: filtered.filter(
        (o) => o.status === "needs_review" && o.deliveryStatus !== "cancelled"
      ).length,
      inTransit: filtered.filter((o) => o.deliveryStatus === "out_for_delivery").length,
      delivered: filtered.filter((o) => o.deliveryStatus === "delivered").length,
      revenue,
    };
  }, [filtered]);

  async function approve(id: string) {
    setBusyId(id);
    await fetch(`/api/orders/${id}/approve`, { method: "POST" });
    setBusyId(null);
    load();
  }

  async function setDelivery(id: string, deliveryStatus: string) {
    setBusyId(id);
    await fetch(`/api/admin/orders/${id}/delivery-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryStatus }),
    });
    setBusyId(null);
    load();
  }

  async function cancel(id: string) {
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

  async function remove(id: string) {
    if (!confirm("Delete this order permanently? This cannot be undone.")) return;
    setBusyId(id);
    await fetch(`/api/admin/orders/${id}`, { method: "DELETE" });
    setBusyId(null);
    load();
  }

  const [deletingAll, setDeletingAll] = useState(false);

  async function deleteIds(ids: string[]) {
    setActionError(null);
    const res = await fetch("/api/admin/orders", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setActionError(body.error ?? "Could not delete these orders.");
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    load();
  }

  async function removeAll() {
    if (filtered.length === 0) return;
    const scoped = filtered.length !== (orders?.length ?? 0);
    const label = scoped ? `these ${filtered.length} filtered orders` : `all ${filtered.length} orders`;
    if (!confirm(`Delete ${label} permanently? This cannot be undone.`)) return;
    setDeletingAll(true);
    await deleteIds(filtered.map((o) => o.id));
    setDeletingAll(false);
  }

  async function removeSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected order(s) permanently? This cannot be undone.`))
      return;
    setDeletingAll(true);
    await deleteIds(Array.from(selectedIds));
    setDeletingAll(false);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((o) => selectedIds.has(o.id));

  function toggleSelectAllFiltered() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const o of filtered) next.delete(o.id);
      } else {
        for (const o of filtered) next.add(o.id);
      }
      return next;
    });
  }

  function resetFilters() {
    setStatusFilter("all");
    setDeliveryFilter("all");
    setSourceFilter("all");
    setCustomerFilter("all");
    setSearch("");
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-brand-navy">Order management</h1>
      <p className="mb-5 text-sm text-brand-muted">
        Review, approve, and move customer orders through fulfilment.
      </p>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Orders shown" value={String(stats.total)} />
        <StatCard label="Needs review" value={String(stats.needsReview)} accent="amber" />
        <StatCard label="Out for delivery" value={String(stats.inTransit)} accent="blue" />
        <StatCard label="Delivered" value={String(stats.delivered)} accent="green" />
        <StatCard label="Order value" value={formatIdr(stats.revenue)} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search store, contact, product, transcript…"
          className="min-w-[240px] flex-1 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <FilterSelect
          label="Customer"
          value={customerFilter}
          onChange={setCustomerFilter}
          options={[
            ["all", "All customers"],
            ...customerOptions.map(([id, name]) => [id, name] as [string, string]),
            ["unassigned", "No store attached"],
          ]}
        />
        <FilterSelect
          label="Review"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            ["all", "All"],
            ["needs_review", "Needs review"],
            ["parsed", "Parsed"],
            ["confirmed", "Confirmed"],
          ]}
        />
        <FilterSelect
          label="Delivery"
          value={deliveryFilter}
          onChange={setDeliveryFilter}
          options={[
            ["all", "All"],
            ...DELIVERY_STAGES.map((s) => [s.value, s.label] as [string, string]),
            ["cancelled", "Cancelled"],
          ]}
        />
        <FilterSelect
          label="Source"
          value={sourceFilter}
          onChange={setSourceFilter}
          options={[
            ["all", "All"],
            ["voice", "Voice note"],
            ["photo", "Photo note"],
            ["manual", "Manual PO"],
          ]}
        />
        <button
          onClick={resetFilters}
          className="rounded-lg border border-brand-border px-3 py-2 text-xs font-medium text-brand-muted hover:bg-background"
        >
          Reset
        </button>
        <button
          onClick={removeSelected}
          disabled={deletingAll || selectedIds.size === 0}
          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-brand-red hover:bg-red-50 disabled:opacity-50"
        >
          {deletingAll ? "Deleting…" : `Delete selected (${selectedIds.size})`}
        </button>
        <button
          onClick={removeAll}
          disabled={deletingAll || filtered.length === 0}
          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-brand-red hover:bg-red-50 disabled:opacity-50"
        >
          {deletingAll
            ? "Deleting…"
            : filtered.length !== (orders?.length ?? 0)
              ? `Delete filtered (${filtered.length})`
              : "Delete all orders"}
        </button>
      </div>

      {filtered.length > 0 && (
        <label className="mb-2 flex items-center gap-2 text-xs font-medium text-brand-muted">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleSelectAllFiltered}
            className="h-4 w-4 rounded border-brand-border"
          />
          Select all shown
        </label>
      )}

      {actionError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {orders === null && <p className="text-sm text-brand-muted">Loading orders…</p>}
      {orders !== null && filtered.length === 0 && (
        <p className="text-sm text-brand-muted">No orders match these filters.</p>
      )}

      <div className="space-y-2">
        {filtered.map((order) => {
          const total = order.items.reduce(
            (sum, i) => sum + (i.unitPriceIdr ?? 0) * i.quantity,
            0
          );
          const next = nextDeliveryStatus(order.deliveryStatus);
          const isBusy = busyId === order.id;
          const isOpen = expandedId === order.id;
          const needsReview = order.status === "needs_review";
          const canApprove = needsReview && order.deliveryStatus !== "cancelled";
          const canCancel = CANCELLABLE.includes(order.deliveryStatus);

          return (
            <div key={order.id} className="rounded-xl border border-brand-border bg-brand-surface">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.has(order.id)}
                  onChange={() => toggleSelect(order.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded border-brand-border"
                />
                <button
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
                >
                  <span className="text-sm">
                    {SOURCE_LABELS[order.sourceType] ?? order.sourceType}
                  </span>
                  <span className="min-w-[150px] text-sm font-medium text-brand-navy">
                    {order.storeName ?? order.customerName ?? (
                      <span className="text-brand-muted">No store attached</span>
                    )}
                  </span>
                  {order.contactName && (
                    <span className="text-xs text-brand-muted">
                      {order.contactName}
                      {order.customerCity ? ` · ${order.customerCity}` : ""}
                    </span>
                  )}
                  <span className="text-sm">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </span>
                  {total > 0 && (
                    <span className="text-sm font-medium text-brand-navy">{formatIdr(total)}</span>
                  )}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      needsReview ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                    }`}
                  >
                    {order.status.replace("_", " ")}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      order.deliveryStatus === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : order.deliveryStatus === "delivered"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {DELIVERY_LABELS[order.deliveryStatus] ?? order.deliveryStatus}
                  </span>
                </button>

                <div className="flex items-center gap-3">
                  {canApprove && (
                    <button
                      onClick={() => approve(order.id)}
                      disabled={isBusy}
                      className="text-xs font-medium text-green-700 hover:underline disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {!needsReview && next && order.deliveryStatus !== "cancelled" && (
                    <button
                      onClick={() => setDelivery(order.id, next)}
                      disabled={isBusy}
                      className="rounded-lg bg-brand-navy px-3 py-1 text-xs font-medium text-white hover:bg-brand-navy-light disabled:opacity-50"
                    >
                      Mark {DELIVERY_LABELS[next]?.toLowerCase()}
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => cancel(order.id)}
                      disabled={isBusy}
                      className="text-xs font-medium text-brand-muted hover:text-brand-red hover:underline disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => remove(order.id)}
                    disabled={isBusy}
                    className="text-xs font-medium text-brand-red hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                  <span className="text-xs text-brand-muted">
                    {new Date(order.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-brand-border px-4 py-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="mb-1 text-xs font-semibold uppercase text-brand-muted">
                        Customer
                      </h4>
                      {order.storeName ? (
                        <div className="text-xs text-brand-muted">
                          <p className="text-sm font-medium text-foreground">{order.storeName}</p>
                          <p>{order.contactName}</p>
                          {order.customerPhone && <p>{order.customerPhone}</p>}
                          {order.customerCity && <p>{order.customerCity}</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-brand-muted">
                          No store profile attached to this order.
                        </p>
                      )}

                      {order.sourceType !== "manual" && (
                        <>
                          <h4 className="mb-1 mt-3 text-xs font-semibold uppercase text-brand-muted">
                            AI extraction
                          </h4>
                          <p className="text-xs text-brand-muted">
                            {order.extractionModel ? (
                              <>
                                model <code className="font-mono">{order.extractionModel}</code>
                                {order.extractionTokens != null && (
                                  <> · {order.extractionTokens} tokens</>
                                )}
                                {order.extractionMs != null && <> · {order.extractionMs}ms</>}
                                {order.detectedLanguage && <> · lang {order.detectedLanguage}</>}
                              </>
                            ) : (
                              "no model metadata recorded"
                            )}
                          </p>
                          {order.rawText && (
                            <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-background p-2 text-[11px]">
                              {order.rawText}
                            </pre>
                          )}

                          {order.mediaUrl && (
                            <div className="mt-3">
                              <h4 className="mb-1 text-xs font-semibold uppercase text-brand-muted">
                                Source {order.sourceType === "photo" ? "photo" : "recording"}
                              </h4>
                              <MediaPreview
                                sourceType={order.sourceType}
                                mediaUrl={order.mediaUrl}
                              />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-1 text-xs font-semibold uppercase text-brand-muted">
                        Items
                      </h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-brand-muted">
                            <th className="pb-1">Product</th>
                            <th className="pb-1">Qty</th>
                            <th className="pb-1 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id} className="border-t border-brand-border">
                              <td className="py-1">
                                {item.productName ?? (
                                  <span className="text-brand-orange">
                                    {item.rawProductName} (unmatched)
                                  </span>
                                )}
                                {item.appliedDiscountPercent && (
                                  <span className="ml-1.5 rounded-full bg-brand-orange/15 px-1.5 py-0.5 text-[10px] font-medium text-brand-orange">
                                    −{item.appliedDiscountPercent}%
                                  </span>
                                )}
                              </td>
                              <td className="py-1">
                                {item.quantity} {item.unit}
                              </td>
                              <td className="py-1 text-right">
                                {item.unitPriceIdr != null
                                  ? formatIdr(item.unitPriceIdr * item.quantity)
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {order.notes && (
                        <p className="mt-2 text-xs italic text-brand-muted">Notes: {order.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-brand-border pt-3">
                    {DELIVERY_STAGES.map((stage) => (
                      <button
                        key={stage.value}
                        onClick={() => setDelivery(order.id, stage.value)}
                        disabled={isBusy || needsReview}
                        className={`rounded-full px-3 py-1 text-xs font-medium disabled:opacity-40 ${
                          order.deliveryStatus === stage.value
                            ? "bg-brand-navy text-white"
                            : "border border-brand-border text-brand-muted hover:bg-background"
                        }`}
                      >
                        {stage.icon} {stage.label}
                      </button>
                    ))}
                  </div>
                  {needsReview && order.deliveryStatus === "cancelled" && (
                    <p className="mt-2 text-xs text-brand-muted">
                      This order was cancelled before it was ever reviewed — nothing left to do.
                    </p>
                  )}
                  {needsReview && order.deliveryStatus !== "cancelled" && (
                    <p className="mt-2 text-xs text-amber-700">
                      Approve this order before setting a delivery stage.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "amber" | "blue" | "green";
}) {
  const accentClass =
    accent === "amber"
      ? "text-amber-700"
      : accent === "blue"
        ? "text-blue-700"
        : accent === "green"
          ? "text-green-700"
          : "text-brand-navy";
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-3">
      <p className="text-xs text-brand-muted">{label}</p>
      <p className={`text-lg font-semibold ${accentClass}`}>{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="text-xs font-medium text-brand-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block max-w-[170px] rounded-lg border border-brand-border bg-brand-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand-blue"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <AdminOrdersInner />
    </Suspense>
  );
}
