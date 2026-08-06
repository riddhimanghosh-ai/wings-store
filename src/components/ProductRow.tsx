"use client";

import { useEffect, useState } from "react";
import { boxPriceFor, packSizeFor, rp } from "@/lib/wings-catalog";
import { useCart } from "@/lib/wings-cart";

export type WingsProduct = {
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

const FAV_KEY = "wings_favourites";

function readFavourites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function ProductRow({ product }: { product: WingsProduct }) {
  const { cart, setLine } = useCart();
  const line = cart[product.id];
  const [fav, setFav] = useState(false);

  useEffect(() => setFav(readFavourites().includes(product.id)), [product.id]);

  function toggleFav() {
    const current = readFavourites();
    const next = current.includes(product.id)
      ? current.filter((id) => id !== product.id)
      : [...current, product.id];
    localStorage.setItem(FAV_KEY, JSON.stringify(next));
    setFav(next.includes(product.id));
  }

  const packSize = packSizeFor(product);
  const boxPrice = boxPriceFor(product);
  const added = Boolean(line && (line.box > 0 || line.pcs > 0));
  const lineTotal = (line?.box ?? 0) * boxPrice + (line?.pcs ?? 0) * product.priceIdr;

  return (
    <div className="border-b border-wings-line bg-wings-surface px-3 py-3">
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 rounded border border-wings-line bg-[#fafafa]">
          <div className="flex h-full items-center justify-center text-[9px] font-extrabold tracking-tight text-wings-red">
            WINGS
          </div>
          <span className="absolute -bottom-1 left-0 right-0 whitespace-nowrap bg-wings-yellow px-0.5 text-center text-[7px] font-semibold leading-[1.4] text-[#5c4a00]">
            ECERAN {rp(product.priceIdr)}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-sm leading-snug text-foreground">{product.name}</p>
            <button
              onClick={toggleFav}
              aria-label={fav ? "Hapus dari favorit" : "Tambah ke favorit"}
              className="shrink-0 text-lg leading-none"
            >
              {fav ? <span className="text-wings-red">♥</span> : <span className="text-wings-grey">♡</span>}
            </button>
          </div>

          <p className="mt-0.5 text-[11px] text-wings-grey">
            1 box @ {packSize} {product.unit}
          </p>

          <div className="mt-1.5 flex items-baseline gap-3">
            <span className="text-sm font-semibold text-foreground">{rp(boxPrice)}</span>
            <span className="text-xs text-wings-grey">{rp(product.priceIdr)}</span>
          </div>

          {product.discountPercent != null && product.discountMinQty != null && (
            <p className="mt-1 text-[11px] font-medium text-wings-orange">
              Diskon {product.discountPercent}% min. {product.discountMinQty} {product.unit}
            </p>
          )}

          {!added ? (
            <button
              onClick={() => setLine(product.id, { box: 1 })}
              className="mt-2 w-full bg-wings-red py-1.5 text-xs font-semibold text-white hover:bg-wings-red-dark"
            >
              🛒 Tambahkan
            </button>
          ) : (
            <div className="mt-2 space-y-1.5">
              <Stepper
                label="BOX"
                value={line?.box ?? 0}
                onChange={(box) => setLine(product.id, { box })}
              />
              <Stepper
                label="PCS"
                value={line?.pcs ?? 0}
                onChange={(pcs) => setLine(product.id, { pcs })}
              />
              <p className="text-right text-[11px] font-semibold text-wings-red">
                {rp(lineTotal)} (est)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        aria-label={`Kurangi ${label}`}
        className="h-7 w-7 border border-wings-line text-base leading-none text-wings-grey-dark"
      >
        −
      </button>
      <input
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
        inputMode="numeric"
        className="h-7 w-12 border-b border-wings-line bg-transparent text-center text-sm outline-none"
      />
      <button
        onClick={() => onChange(value + 1)}
        aria-label={`Tambah ${label}`}
        className="h-7 w-7 border border-wings-line text-base leading-none text-wings-grey-dark"
      >
        +
      </button>
      <span className="rounded bg-[#37474f] px-2 py-0.5 text-[10px] font-semibold text-white">
        {label}
      </span>
    </div>
  );
}
