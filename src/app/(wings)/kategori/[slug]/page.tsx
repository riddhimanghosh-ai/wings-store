"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { categoryBySlug, packSizeFor, boxPriceFor } from "@/lib/wings-catalog";
import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";
import { useCart } from "@/lib/wings-cart";
import ProductRow, { type WingsProduct } from "@/components/ProductRow";

const SORTS = [
  { key: "terbaru", labelKey: "sortNewest" },
  { key: "promo", labelKey: "sortPromo" },
  { key: "laku", labelKey: "sortBestSelling" },
  { key: "pack", labelKey: "sortPack" },
  { key: "az", labelKey: "sortAz" },
  { key: "za", labelKey: "sortZa" },
] as const;

function KategoriInner() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { itemCount } = useCart();
  const { t } = useLang();

  const slug = params.slug;
  const category = categoryBySlug(slug);
  const initialQuery = searchParams.get("q") ?? "";
  const promoOnly = searchParams.get("promo") === "1";

  const [products, setProducts] = useState<WingsProduct[] | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [searching, setSearching] = useState(Boolean(initialQuery));
  const [brand, setBrand] = useState("All");
  const [sort, setSort] = useState<string>(promoOnly ? "promo" : "terbaru");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [packFilter, setPackFilter] = useState<number[]>([]);
  const [unitFilter, setUnitFilter] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products));
  }, []);

  const scoped = useMemo(() => {
    if (!products) return [];
    if (slug === "semua") return products;
    if (!category) return products;
    return products.filter((p) => category.dbCategories.includes(p.category));
  }, [products, slug, category]);

  const brands = useMemo(
    () => Array.from(new Set(scoped.map((p) => p.brand))).sort(),
    [scoped]
  );
  const packSizes = useMemo(
    () => Array.from(new Set(scoped.map((p) => packSizeFor(p)))).sort((a, b) => a - b),
    [scoped]
  );
  const units = useMemo(() => Array.from(new Set(scoped.map((p) => p.unit))).sort(), [scoped]);

  const listed = useMemo(() => {
    let out = [...scoped];
    const term = query.trim().toLowerCase();

    if (term)
      out = out.filter((p) =>
        `${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(term)
      );
    if (brand !== "All") out = out.filter((p) => p.brand === brand);
    if (promoOnly) out = out.filter((p) => p.discountPercent != null);
    if (packFilter.length) out = out.filter((p) => packFilter.includes(packSizeFor(p)));
    if (unitFilter.length) out = out.filter((p) => unitFilter.includes(p.unit));

    switch (sort) {
      case "promo":
        out.sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0));
        break;
      case "laku":
        out.sort((a, b) => boxPriceFor(b) - boxPriceFor(a));
        break;
      case "pack":
        out.sort((a, b) => packSizeFor(a) - packSizeFor(b));
        break;
      case "az":
        out.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "za":
        out.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        out.sort((a, b) => a.sku.localeCompare(b.sku));
    }
    return out;
  }, [scoped, query, brand, promoOnly, packFilter, unitFilter, sort]);

  const activeFilterCount = packFilter.length + unitFilter.length + (brand !== "All" ? 1 : 0);
  const title = slug === "semua" ? t("allProducts") : category ? t(category.labelKey) : t("products");

  return (
    <div className="pb-4">
      <header className="sticky top-0 z-20 bg-wings-surface">
        <div className="flex items-center gap-3 border-b border-wings-line px-3 py-3">
          <button onClick={() => router.back()} aria-label="back" className="text-xl text-wings-grey-dark">
            ‹
          </button>

          {searching ? (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchProduct")}
              className="flex-1 border-b border-wings-line bg-transparent py-1 text-sm outline-none"
            />
          ) : (
            <h1 className="flex-1 text-base font-medium text-foreground">{title}</h1>
          )}

          <button onClick={() => setSearching((v) => !v)} aria-label={t("searchProduct")} className="text-lg text-wings-grey-dark">
            🔍
          </button>
          <LangToggle />
          <Link href="/keranjang" aria-label={t("cart")} className="relative text-lg text-wings-grey-dark">
            🛒
            {itemCount > 0 && (
              <span className="absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-wings-red px-1 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>

        <div className="flex border-b border-wings-line">
          <button
            onClick={() => setSortOpen(true)}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm text-wings-grey-dark"
          >
            ↑↓ {t("sortBy")}
          </button>
          <span className="my-2 w-px bg-wings-line" />
          <button
            onClick={() => setFilterOpen(true)}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm text-wings-grey-dark"
          >
            ▽ {t("filter")}
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-wings-red px-1.5 text-[10px] font-semibold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-wings-line px-3 py-2">
          {["All", ...brands].map((b) => (
            <button
              key={b}
              onClick={() => setBrand(b)}
              className={`whitespace-nowrap px-3 py-1 text-xs font-semibold uppercase ${
                brand === b ? "bg-wings-red text-white" : "bg-[#37474f] text-white/90"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
      </header>

      <p className="px-4 py-2 text-xs text-wings-grey">{listed.length} {t("products")}</p>

      {products === null && <p className="px-4 py-6 text-sm text-wings-grey">{t("loadingProducts")}</p>}
      {products !== null && listed.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-wings-grey">
          {t("notFound")}
        </p>
      )}
      {listed.map((p) => (
        <ProductRow key={p.id} product={p} />
      ))}

      {sortOpen && (
        <Sheet title={t("sortBy")} onClose={() => setSortOpen(false)}>
          <div className="divide-y divide-wings-line">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => setSort(s.key)}
                className={`flex w-full items-center justify-between px-4 py-3.5 text-left text-sm ${
                  sort === s.key ? "font-semibold text-wings-red" : "text-wings-grey-dark"
                }`}
              >
                {t(s.labelKey)}
                {sort === s.key && <span>✓</span>}
              </button>
            ))}
          </div>
          <div className="p-4">
            <button
              onClick={() => setSortOpen(false)}
              className="w-full bg-wings-red py-3 text-sm font-semibold text-white"
            >
              {t("apply")}
            </button>
          </div>
        </Sheet>
      )}

      {filterOpen && (
        <Sheet title={t("filter")} onClose={() => setFilterOpen(false)}>
          <div className="px-4 py-3">
            <ChipGroup
              label={t("brand")}
              options={brands}
              selected={brand === "All" ? [] : [brand]}
              onToggle={(v) => setBrand((prev) => (prev === v ? "All" : v))}
            />
            <ChipGroup
              label={t("packSize")}
              options={packSizes.map((n) => `${n}`)}
              selected={packFilter.map(String)}
              onToggle={(v) =>
                setPackFilter((prev) =>
                  prev.includes(Number(v)) ? prev.filter((x) => x !== Number(v)) : [...prev, Number(v)]
                )
              }
            />
            <ChipGroup
              label={t("variant")}
              options={units}
              selected={unitFilter}
              onToggle={(v) =>
                setUnitFilter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
              }
            />
          </div>
          <div className="flex gap-2 p-4">
            <button
              onClick={() => {
                setBrand("All");
                setPackFilter([]);
                setUnitFilter([]);
              }}
              className="flex-1 border border-wings-line py-3 text-sm font-medium text-wings-grey-dark"
            >
              {t("reset")}
            </button>
            <button
              onClick={() => setFilterOpen(false)}
              className="flex-1 bg-wings-red py-3 text-sm font-semibold text-white"
            >
              {t("apply")}
            </button>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mt-auto max-h-[85vh] overflow-y-auto bg-wings-surface"
      >
        <header className="sticky top-0 flex items-center gap-3 border-b border-wings-line bg-wings-surface px-4 py-3">
          <button onClick={onClose} aria-label="close" className="text-xl text-wings-grey-dark">
            ‹
          </button>
          <h2 className="text-base font-medium">{title}</h2>
        </header>
        {children}
      </div>
    </div>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="mb-5">
      <p className="mb-2 text-sm text-wings-grey">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onToggle(o)}
            className={`px-3 py-1.5 text-xs font-medium ${
              selected.includes(o) ? "bg-wings-red text-white" : "bg-[#37474f] text-white/90"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function KategoriPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-wings-surface" />}>
      <KategoriInner />
    </Suspense>
  );
}
