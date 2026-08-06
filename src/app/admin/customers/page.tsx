"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatIdr } from "@/lib/format";

type Customer = {
  id: string;
  storeName: string;
  contactName: string;
  phone: string | null;
  city: string | null;
  address: string | null;
};

type OrderItem = { quantity: number; unitPriceIdr: number | null };
type Order = {
  id: string;
  customerId: string | null;
  deliveryStatus: string;
  status: string;
  createdAt: string;
  items: OrderItem[];
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [sort, setSort] = useState<"name" | "orders" | "value">("value");

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => setCustomers(d.customers));
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders));
  }, []);

  const cities = useMemo(
    () =>
      Array.from(new Set((customers ?? []).map((c) => c.city).filter(Boolean))).sort() as string[],
    [customers]
  );

  const rows = useMemo(() => {
    if (!customers) return [];
    const term = search.trim().toLowerCase();

    const enriched = customers.map((c) => {
      const theirs = orders.filter((o) => o.customerId === c.id);
      const value = theirs.reduce(
        (sum, o) => sum + o.items.reduce((s, i) => s + (i.unitPriceIdr ?? 0) * i.quantity, 0),
        0
      );
      return {
        ...c,
        orderCount: theirs.length,
        needsReview: theirs.filter((o) => o.status === "needs_review").length,
        active: theirs.filter(
          (o) => o.deliveryStatus !== "delivered" && o.deliveryStatus !== "cancelled"
        ).length,
        value,
        lastOrder: theirs.length
          ? theirs.reduce(
              (latest, o) => (new Date(o.createdAt) > new Date(latest) ? o.createdAt : latest),
              theirs[0].createdAt
            )
          : null,
      };
    });

    const filtered = enriched.filter((c) => {
      if (cityFilter !== "all" && c.city !== cityFilter) return false;
      if (term) {
        const haystack = `${c.storeName} ${c.contactName} ${c.phone ?? ""} ${c.city ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    if (sort === "name") filtered.sort((a, b) => a.storeName.localeCompare(b.storeName));
    else if (sort === "orders") filtered.sort((a, b) => b.orderCount - a.orderCount);
    else filtered.sort((a, b) => b.value - a.value);

    return filtered;
  }, [customers, orders, search, cityFilter, sort]);

  const totals = useMemo(
    () => ({
      customers: rows.length,
      orders: rows.reduce((s, c) => s + c.orderCount, 0),
      value: rows.reduce((s, c) => s + c.value, 0),
    }),
    [rows]
  );

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-brand-navy">Customers</h1>
      <p className="mb-5 text-sm text-brand-muted">
        Retailers and distributors ordering Wings products, with their order history.
      </p>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <Stat label="Customers" value={String(totals.customers)} />
        <Stat label="Total orders" value={String(totals.orders)} />
        <Stat label="Lifetime value" value={formatIdr(totals.value)} />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search store, contact, phone…"
          className="min-w-[220px] flex-1 rounded-lg border border-brand-border bg-brand-surface px-3 py-2 text-sm outline-none focus:border-brand-blue"
        />
        <label className="text-xs font-medium text-brand-muted">
          City
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="mt-1 block rounded-lg border border-brand-border bg-brand-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand-blue"
          >
            <option value="all">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-brand-muted">
          Sort by
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as typeof sort)}
            className="mt-1 block rounded-lg border border-brand-border bg-brand-surface px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand-blue"
          >
            <option value="value">Highest value</option>
            <option value="orders">Most orders</option>
            <option value="name">Store name</option>
          </select>
        </label>
      </div>

      {customers === null && <p className="text-sm text-brand-muted">Loading customers…</p>}
      {customers !== null && rows.length === 0 && (
        <p className="text-sm text-brand-muted">No customers match these filters.</p>
      )}

      <div className="overflow-hidden rounded-xl border border-brand-border bg-brand-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-background text-left text-xs uppercase text-brand-muted">
              <th className="px-4 py-2">Store</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">City</th>
              <th className="px-4 py-2">Orders</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2">Value</th>
              <th className="px-4 py-2">Last order</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-brand-border last:border-0">
                <td className="px-4 py-2 font-medium">{c.storeName}</td>
                <td className="px-4 py-2 text-brand-muted">
                  {c.contactName}
                  {c.phone && <span className="block text-xs">{c.phone}</span>}
                </td>
                <td className="px-4 py-2 text-brand-muted">{c.city ?? "—"}</td>
                <td className="px-4 py-2">
                  {c.orderCount}
                  {c.needsReview > 0 && (
                    <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                      {c.needsReview} to review
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">{c.active}</td>
                <td className="px-4 py-2 font-medium">{formatIdr(c.value)}</td>
                <td className="px-4 py-2 text-xs text-brand-muted">
                  {c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : "never"}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/orders?customer=${c.id}`}
                    className="text-xs font-medium text-brand-blue hover:underline"
                  >
                    View orders
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-surface p-3">
      <p className="text-xs text-brand-muted">{label}</p>
      <p className="text-lg font-semibold text-brand-navy">{value}</p>
    </div>
  );
}
