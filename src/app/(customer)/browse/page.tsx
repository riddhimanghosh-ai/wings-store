"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatIdr, categoryLabel } from "@/lib/format";
import { discountInfo } from "@/lib/discount";
import { useProfile } from "@/lib/use-profile";

type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  priceIdr: number;
  discountMinQty: number | null;
  discountPercent: number | null;
};

type SortKey = "relevance" | "price_asc" | "price_desc" | "discount" | "name";

const SORT_LABELS: Record<SortKey, string> = {
  relevance: "Default",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  discount: "Biggest discount",
  name: "Name A–Z",
};

function unitPrice(p: Product, qty: number) {
  const info = discountInfo(p, qty);
  if (info?.eligible) return Math.round(p.priceIdr * (1 - info.percent / 100));
  return p.priceIdr;
}

function BrowsePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useProfile();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [category, setCategory] = useState(searchParams.get("category") ?? "all");
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [showFilters, setShowFilters] = useState(false);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.products));
  }, []);

  const categories = useMemo(
    () => (products ? Array.from(new Set(products.map((p) => p.category))) : []),
    [products]
  );

  const brands = useMemo(() => {
    if (!products) return [];
    const pool = category === "all" ? products : products.filter((p) => p.category === category);
    return Array.from(new Set(pool.map((p) => p.brand))).sort();
  }, [products, category]);

  const priceCeiling = useMemo(
    () => (products?.length ? Math.max(...products.map((p) => p.priceIdr)) : 0),
    [products]
  );

  const filtered = useMemo(() => {
    if (!products) return [];
    const term = search.trim().toLowerCase();

    const result = products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (brand !== "all" && p.brand !== brand) return false;
      if (discountOnly && p.discountPercent == null) return false;
      if (maxPrice != null && p.priceIdr > maxPrice) return false;
      if (term) {
        const haystack = `${p.name} ${p.brand} ${p.sku}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });

    const sorted = [...result];
    if (sort === "price_asc") sorted.sort((a, b) => a.priceIdr - b.priceIdr);
    else if (sort === "price_desc") sorted.sort((a, b) => b.priceIdr - a.priceIdr);
    else if (sort === "discount")
      sorted.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));

    return sorted;
  }, [products, category, brand, discountOnly, maxPrice, search, sort]);

  const cartLines = useMemo(() => {
    if (!products) return [];
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([productId, qty]) => {
        const product = products.find((p) => p.id === productId)!;
        return { product, qty, unitPriceIdr: unitPrice(product, qty) };
      })
      .filter((l) => l.product);
  }, [cart, products]);

  const cartCount = cartLines.reduce((sum, l) => sum + l.qty, 0);
  const cartTotal = cartLines.reduce((sum, l) => sum + l.qty * l.unitPriceIdr, 0);

  const activeFilterCount =
    (brand !== "all" ? 1 : 0) + (discountOnly ? 1 : 0) + (maxPrice != null ? 1 : 0);

  function setQty(productId: string, qty: number) {
    setCart((prev) => ({ ...prev, [productId]: Math.max(0, qty) }));
  }

  function clearFilters() {
    setBrand("all");
    setMaxPrice(null);
    setDiscountOnly(false);
    setSort("relevance");
  }

  async function submitOrder() {
    if (!profile) {
      setSubmitError("Select which store you're ordering for first (top-right of the header).");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const res = await fetch("/api/orders/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: profile.id,
        customerName: profile.storeName,
        items: cartLines.map((l) => ({ productId: l.product.id, quantity: l.qty })),
      }),
    });
    setSubmitting(false);
    if (res.ok) {
      const body = await res.json();
      router.push(`/orders?focus=${body.orderId}`);
    } else {
      const body = await res.json().catch(() => ({}));
      setSubmitError(body.error ?? "Could not place the order.");
    }
  }

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 border-b border-brand-border bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-brand-muted">
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, brands, SKU…"
              className="w-full rounded-full border border-brand-border bg-brand-surface py-2 pl-9 pr-9 text-sm outline-none focus:border-brand-blue"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-muted"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative rounded-full border px-3 py-2 text-xs font-medium ${
              showFilters || activeFilterCount > 0
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-brand-border bg-brand-surface text-brand-navy"
            }`}
          >
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-white px-1.5 text-[10px] font-semibold text-brand-navy">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={category === "all"} onClick={() => setCategory("all")} label="All" />
          {categories.map((c) => (
            <Chip
              key={c}
              active={category === c}
              onClick={() => {
                setCategory(c);
                setBrand("all");
              }}
              label={categoryLabel(c)}
            />
          ))}
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3 rounded-xl border border-brand-border bg-brand-surface p-3">
            <label className="block text-xs font-medium text-brand-muted">
              Brand
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-1 w-full rounded-lg border border-brand-border px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand-blue"
              >
                <option value="all">All brands ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-brand-muted">
              Sort by
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="mt-1 w-full rounded-lg border border-brand-border px-2 py-1.5 text-sm text-foreground outline-none focus:border-brand-blue"
              >
                {Object.entries(SORT_LABELS).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-brand-muted">
              Max price: {maxPrice != null ? formatIdr(maxPrice) : "any"}
              <input
                type="range"
                min={0}
                max={priceCeiling}
                step={500}
                value={maxPrice ?? priceCeiling}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setMaxPrice(v >= priceCeiling ? null : v);
                }}
                className="mt-1 w-full"
              />
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-brand-muted">
              <input
                type="checkbox"
                checked={discountOnly}
                onChange={(e) => setDiscountOnly(e.target.checked)}
              />
              Discounted products only
            </label>

            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-brand-red hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      <p className="px-4 pt-3 text-xs text-brand-muted">
        {products === null
          ? "Loading catalogue…"
          : `${filtered.length} product${filtered.length !== 1 ? "s" : ""}`}
        {sort !== "relevance" && ` · ${SORT_LABELS[sort]}`}
      </p>

      {products !== null && filtered.length === 0 && (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-brand-muted">No products match your search or filters.</p>
          <button
            onClick={() => {
              setSearch("");
              clearFilters();
              setCategory("all");
            }}
            className="mt-2 text-sm font-medium text-brand-blue hover:underline"
          >
            Reset everything
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 px-4 pt-2 sm:grid-cols-3">
        {filtered.map((p) => {
          const qty = cart[p.id] ?? 0;
          const price = unitPrice(p, qty || 1);
          const info = discountInfo(p, qty);
          return (
            <div
              key={p.id}
              className="flex flex-col rounded-xl border border-brand-border bg-brand-surface p-3"
            >
              <span className="mb-1 font-mono text-[11px] text-brand-muted">{p.sku}</span>
              <span className="text-sm font-medium leading-snug">{p.name}</span>
              <span className="mb-2 text-xs text-brand-muted">{p.brand}</span>

              {info && (
                <span
                  className={`mb-2 inline-block w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    info.eligible
                      ? "bg-green-100 text-green-700"
                      : "bg-brand-orange/15 text-brand-orange"
                  }`}
                >
                  {info.eligible
                    ? `✓ ${info.percent}% off applied`
                    : qty > 0
                      ? `Add ${info.remaining} more for ${info.percent}% off`
                      : `${info.percent}% off ${info.minQty}+`}
                </span>
              )}

              <div className="mt-auto flex items-center justify-between">
                <span className="text-sm font-semibold text-brand-navy">{formatIdr(price)}</span>
                <span className="text-[11px] text-brand-muted">/{p.unit}</span>
              </div>

              {qty === 0 ? (
                <button
                  onClick={() => setQty(p.id, 1)}
                  className="mt-2 rounded-lg border border-brand-blue py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue/5"
                >
                  Add
                </button>
              ) : (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-brand-navy">
                  <button
                    onClick={() => setQty(p.id, qty - 1)}
                    aria-label={`Decrease ${p.name}`}
                    className="px-3 py-1.5 text-sm font-bold text-white"
                  >
                    −
                  </button>
                  <span className="text-sm font-medium text-white">{qty}</span>
                  <button
                    onClick={() => setQty(p.id, qty + 1)}
                    aria-label={`Increase ${p.name}`}
                    className="px-3 py-1.5 text-sm font-bold text-white"
                  >
                    +
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cartCount > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed inset-x-4 bottom-20 z-20 flex items-center justify-between rounded-xl bg-brand-navy px-5 py-3.5 text-white shadow-lg"
        >
          <span className="text-sm font-medium">
            {cartCount} item{cartCount !== 1 ? "s" : ""} in cart
          </span>
          <span className="text-sm font-semibold">{formatIdr(cartTotal)} · View cart →</span>
        </button>
      )}

      {cartOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/40"
          onClick={() => setCartOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-brand-surface p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-brand-navy">Your purchase order</h2>
              <button onClick={() => setCartOpen(false)} className="text-sm text-brand-muted">
                Close
              </button>
            </div>

            <div className="space-y-3">
              {cartLines.map((l) => {
                const info = discountInfo(l.product, l.qty);
                return (
                  <div key={l.product.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{l.product.name}</p>
                        <p className="text-xs text-brand-muted">
                          {l.qty} × {formatIdr(l.unitPriceIdr)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">
                          {formatIdr(l.qty * l.unitPriceIdr)}
                        </span>
                        <button
                          onClick={() => setQty(l.product.id, 0)}
                          className="text-xs text-brand-red hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    {info && !info.eligible && (
                      <p className="mt-0.5 text-[11px] text-brand-orange">
                        Add {info.remaining} more for {info.percent}% off (min {info.minQty})
                      </p>
                    )}
                    {info?.eligible && (
                      <p className="mt-0.5 text-[11px] text-green-700">
                        ✓ {info.percent}% bulk discount applied
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="my-4 border-t border-brand-border pt-3 text-sm">
              <span className="text-brand-muted">Ordering for </span>
              <span className="font-medium text-brand-navy">
                {profile ? profile.storeName : "— select a store in the header"}
              </span>
            </div>

            <div className="mb-4 flex items-center justify-between text-base font-semibold text-brand-navy">
              <span>Total</span>
              <span>{formatIdr(cartTotal)}</span>
            </div>

            {submitError && <p className="mb-3 text-sm text-brand-red">{submitError}</p>}

            <button
              onClick={submitOrder}
              disabled={submitting}
              className="w-full rounded-xl bg-brand-red py-3 text-sm font-semibold text-white hover:bg-brand-red-dark disabled:opacity-50"
            >
              {submitting ? "Placing order…" : "Place purchase order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium ${
        active
          ? "border-brand-navy bg-brand-navy text-white"
          : "border-brand-border bg-brand-surface text-brand-muted"
      }`}
    >
      {label}
    </button>
  );
}

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowsePageInner />
    </Suspense>
  );
}
