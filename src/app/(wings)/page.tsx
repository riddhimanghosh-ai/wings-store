"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/wings-session";
import { WINGS_CATEGORIES } from "@/lib/wings-catalog";
import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";
import ProductRow, { type WingsProduct } from "@/components/ProductRow";

const TAB_KEYS = ["tabRecommended", "tabFavourite", "tabPromo"] as const;

export default function BerandaPage() {
  const router = useRouter();
  const { session } = useSession();
  const { t } = useLang();
  const [products, setProducts] = useState<WingsProduct[] | null>(null);
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]>("tabRecommended");
  const [query, setQuery] = useState("");
  const [favourites, setFavourites] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => setProducts(d.products));
    try {
      setFavourites(JSON.parse(localStorage.getItem("wings_favourites") ?? "[]"));
    } catch {
      setFavourites([]);
    }
  }, []);

  const listed = useMemo(() => {
    if (!products) return [];
    if (tab === "tabFavourite") return products.filter((p) => favourites.includes(p.id));
    if (tab === "tabPromo") return products.filter((p) => p.discountPercent != null);
    return products.slice(0, 8);
  }, [products, tab, favourites]);

  const topPromo = useMemo(() => {
    if (!products) return null;
    return (
      [...products]
        .filter((p) => p.discountPercent != null)
        .sort((a, b) => (b.discountPercent ?? 0) - (a.discountPercent ?? 0))[0] ?? null
    );
  }, [products]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push(`/kategori/semua?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div>
      <header className="bg-wings-red px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-lg font-semibold text-white">
            {t("hello")}, {session?.storeName?.toUpperCase() ?? "—"}
          </p>
          <div className="flex items-center gap-2">
            <LangToggle onRed />
            <span className="text-xl text-white">🔔</span>
          </div>
        </div>

        <form onSubmit={submitSearch} className="flex items-center gap-2 rounded bg-white px-3 py-2">
          <span className="text-sm text-wings-grey">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchProduct")}
            className="w-full text-sm outline-none placeholder:text-wings-grey"
          />
        </form>
      </header>

      <div className="flex border-b border-wings-line bg-wings-surface">
        {TAB_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-sm ${
              tab === key
                ? "border-b-2 border-wings-red font-semibold text-wings-red"
                : "text-wings-grey-dark"
            }`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {topPromo && (
        <Link
          href={`/kategori/semua?promo=1`}
          className="block bg-wings-orange px-4 py-4 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide opacity-90">{t("discount")}</p>
              <p className="text-3xl font-extrabold leading-none">{topPromo.discountPercent}%</p>
              <p className="mt-1 text-xs opacity-90">
                {t("min")} {topPromo.discountMinQty} {topPromo.unit} · {topPromo.brand}
              </p>
            </div>
            <span className="text-4xl">🏷️</span>
          </div>
        </Link>
      )}

      <section className="bg-wings-surface px-3 py-4">
        <div className="grid grid-cols-5 gap-x-2 gap-y-4">
          {WINGS_CATEGORIES.map((cat) => (
            <Link key={cat.slug} href={`/kategori/${cat.slug}`} className="flex flex-col items-center">
              <span
                className="mb-1.5 flex h-14 w-14 items-center justify-center rounded-lg text-2xl"
                style={{ background: `var(${cat.colorVar})` }}
              >
                {cat.icon}
              </span>
              <span className="text-center text-[10px] leading-tight text-wings-grey-dark">
                {t(cat.labelKey)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Link
        href="/pesan-cepat"
        className="mx-3 mt-3 flex items-center gap-3 rounded-lg border border-wings-red/30 bg-white p-3"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wings-red text-xl text-white">
          🎤
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{t("quickOrderTitle")}</p>
          <p className="text-xs text-wings-grey">{t("quickOrderBody")}</p>
        </div>
        <span className="text-wings-red">›</span>
      </Link>

      <section className="mt-3 bg-wings-surface">
        <h2 className="border-b border-wings-line px-4 py-3 text-sm font-semibold text-foreground">
          {t(tab)}
        </h2>

        {products === null && <p className="px-4 py-6 text-sm text-wings-grey">{t("loadingProducts")}</p>}
        {products !== null && listed.length === 0 && (
          <p className="px-4 py-6 text-sm text-wings-grey">
            {tab === "tabFavourite" ? t("noFavourites") : t("noProducts")}
          </p>
        )}

        {listed.map((p) => (
          <ProductRow key={p.id} product={p} />
        ))}
      </section>

      <div className="px-4 py-6 text-center text-xs text-wings-grey">
        {t("footerNote")}
      </div>
    </div>
  );
}
