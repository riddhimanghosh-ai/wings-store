"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatIdr, categoryLabel } from "@/lib/format";

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

function greeting() {
  const hour = new Date().getHours();
  if (hour < 11) return "Good morning";
  if (hour < 15) return "Good afternoon";
  if (hour < 19) return "Good evening";
  return "Good evening";
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.products));
  }, []);

  const topDiscounts = useMemo(() => {
    if (!products) return [];
    return products
      .filter((p) => p.discountPercent != null)
      .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))
      .slice(0, 8);
  }, [products]);

  const categories = useMemo(() => {
    if (!products) return [];
    return Array.from(new Set(products.map((p) => p.category)));
  }, [products]);

  return (
    <main className="px-4 py-5">
      <p className="text-sm text-brand-muted">{greeting()} 👋</p>
      <h1 className="mb-5 text-xl font-semibold text-brand-navy">
        What would you like to order today?
      </h1>

      <Link
        href="/quick-order"
        className="mb-6 flex items-center gap-4 rounded-2xl bg-brand-navy p-4 text-white shadow-sm transition hover:bg-brand-navy-light"
      >
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/15 text-2xl">
          🎙️
        </div>
        <div className="flex-1">
          <p className="text-base font-semibold">Quick order</p>
          <p className="text-xs text-white/80">
            Record a voice note or snap a photo of a handwritten order
          </p>
        </div>
        <span className="text-xl">→</span>
      </Link>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-brand-navy">🔥 Top discounts today</h2>
          <Link href="/browse" className="text-xs font-medium text-brand-blue hover:underline">
            See all →
          </Link>
        </div>

        {products === null && (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 w-36 flex-shrink-0 animate-pulse rounded-xl border border-brand-border bg-brand-surface" />
            ))}
          </div>
        )}

        <div className="flex gap-3 overflow-x-auto pb-1">
          {topDiscounts.map((p) => (
            <Link
              key={p.id}
              href={`/browse?category=${p.category}`}
              className="flex w-36 flex-shrink-0 flex-col rounded-xl border border-brand-border bg-brand-surface p-3"
            >
              <span className="mb-2 inline-block w-fit rounded-full bg-brand-orange/15 px-2 py-0.5 text-[11px] font-medium text-brand-orange">
                {p.discountPercent}% OFF
              </span>
              <span className="text-sm font-medium leading-snug">{p.name}</span>
              <span className="mb-2 text-xs text-brand-muted">{p.brand}</span>
              <div className="mt-auto flex items-baseline justify-between">
                <span className="text-sm font-semibold text-brand-navy">{formatIdr(p.priceIdr)}</span>
                <span className="text-[10px] text-brand-muted">/{p.unit}</span>
              </div>
              <span className="text-[10px] text-brand-muted">min {p.discountMinQty}+ units</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-base font-semibold text-brand-navy">Browse by category</h2>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((c) => (
            <Link
              key={c}
              href={`/browse?category=${c}`}
              className="whitespace-nowrap rounded-full border border-brand-border bg-brand-surface px-3 py-1.5 text-xs font-medium text-brand-navy"
            >
              {categoryLabel(c)}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
