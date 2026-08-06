"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/wings-session";
import { rp, formatIndoDate } from "@/lib/wings-catalog";

type OrderItem = {
  id: string;
  rawProductName: string;
  productName: string | null;
  quantity: number;
  unit: string;
  unitPriceIdr: number | null;
};

type Order = {
  id: string;
  sourceType: string;
  status: string;
  deliveryStatus: string;
  orderDate: string | null;
  createdAt: string;
  items: OrderItem[];
};

const TABS = [
  { key: "belum", label: "Belum Dikirim" },
  { key: "terkirim", label: "Terkirim" },
  { key: "tagihan", label: "Tagihan" },
] as const;

const CANCELLABLE = ["placed", "packed"];

const DELIVERY_ID: Record<string, string> = {
  placed: "Pesanan dibuat",
  packed: "Sedang dikemas",
  out_for_delivery: "Sedang dikirim",
  delivered: "Terkirim",
  cancelled: "Dibatalkan",
};

function PembelianInner() {
  const searchParams = useSearchParams();
  const { session, ready } = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [tab, setTab] = useState<string>("belum");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [notice, setNotice] = useState<string | null>(
    searchParams.get("baru") === "1" ? "Pesanan Anda sudah diproses. Terima kasih!" : null
  );

  function load() {
    const url = session ? `/api/orders?customerId=${session.id}` : "/api/orders";
    fetch(url)
      .then((r) => r.json())
      .then((d) => setOrders(d.orders));
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, session?.id]);

  const listed = useMemo(() => {
    if (!orders) return [];
    if (tab === "terkirim") return orders.filter((o) => o.deliveryStatus === "delivered");
    if (tab === "tagihan")
      return orders.filter((o) => o.deliveryStatus !== "cancelled");
    return orders.filter(
      (o) => o.deliveryStatus !== "delivered" && o.deliveryStatus !== "cancelled"
    );
  }, [orders, tab]);

  async function cancelOrder(id: string) {
    if (!confirm("Batalkan order ini?")) return;
    setBusyId(id);
    const res = await fetch(`/api/orders/${id}/cancel`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setNotice(body.error ?? "Order tidak dapat dibatalkan.");
    }
    load();
  }

  function soNumber(order: Order) {
    const d = new Date(order.createdAt);
    const stamp = `${String(d.getDate()).padStart(2, "0")}${String(d.getMonth() + 1).padStart(2, "0")}${String(
      d.getFullYear()
    ).slice(2)}${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    return `${stamp}.WS${order.id.slice(0, 6).toUpperCase()}`;
  }

  return (
    <div>
      <header className="bg-wings-red px-4 py-3.5">
        <h1 className="text-center text-base font-semibold text-white">Pembelian</h1>
      </header>

      <div className="flex border-b border-wings-line bg-wings-surface">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2.5 text-sm ${
              tab === t.key
                ? "border-b-2 border-wings-red font-semibold text-wings-red"
                : "text-wings-grey-dark"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <div className="flex items-start gap-2 border-b border-wings-line bg-[#e8f5e9] px-4 py-2.5 text-xs text-green-800">
          <p className="flex-1">{notice}</p>
          <button onClick={() => setNotice(null)} aria-label="Tutup">
            ✕
          </button>
        </div>
      )}

      {showBanner && (
        <div className="flex items-start gap-2 border-b border-wings-line bg-wings-surface px-4 py-2.5 text-xs text-wings-grey-dark">
          <span>ⓘ</span>
          <p className="flex-1">
            SO tidak muncul? <span className="italic text-wings-red">Muat ulang disini</span>
          </p>
          <button onClick={() => setShowBanner(false)} aria-label="Tutup" className="text-wings-grey">
            ✕
          </button>
        </div>
      )}

      {orders === null && <p className="px-4 py-6 text-sm text-wings-grey">Memuat pesanan…</p>}
      {orders !== null && listed.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-wings-grey">
          Belum ada pesanan pada tab ini.
        </p>
      )}

      <div className="space-y-2 pt-2">
        {listed.map((order) => {
          const total = order.items.reduce(
            (s, i) => s + (i.unitPriceIdr ?? 0) * i.quantity,
            0
          );
          const canCancel = CANCELLABLE.includes(order.deliveryStatus);

          return (
            <div key={order.id} className="bg-wings-surface px-4 py-3">
              <p className="text-sm font-semibold text-wings-red">SO # {soNumber(order)}</p>

              <p className="mt-1.5 text-sm text-wings-grey-dark">
                {formatIndoDate(new Date(order.createdAt))}
              </p>
              {order.orderDate && (
                <p className="text-xs text-wings-grey">
                  Kirim: {formatIndoDate(new Date(`${order.orderDate}T00:00:00`))}
                </p>
              )}

              <p className="mt-1 text-sm text-foreground">
                Sisa <span className="font-semibold">{rp(total)}</span>
              </p>
              <p className="text-xs text-wings-grey">0J 0Q 0K</p>

              <div className="mt-2 flex items-center justify-between">
                <span
                  className={`text-xs font-medium ${
                    order.deliveryStatus === "cancelled"
                      ? "text-wings-red"
                      : order.deliveryStatus === "delivered"
                        ? "text-green-700"
                        : "text-wings-grey-dark"
                  }`}
                >
                  {DELIVERY_ID[order.deliveryStatus] ?? order.deliveryStatus}
                </span>
                <span className="text-xs italic text-wings-grey">
                  Ordered by {order.sourceType === "manual" ? "Apps" : order.sourceType === "voice" ? "Suara" : "Foto"}
                </span>
              </div>

              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-wings-red">
                  Lihat {order.items.length} produk
                </summary>
                <div className="mt-2 space-y-1">
                  {order.items.map((i) => (
                    <div key={i.id} className="flex justify-between text-xs text-wings-grey-dark">
                      <span>
                        {i.productName ?? i.rawProductName} × {i.quantity} {i.unit}
                      </span>
                      <span>{i.unitPriceIdr ? rp(i.unitPriceIdr * i.quantity) : "—"}</span>
                    </div>
                  ))}
                </div>
              </details>

              {canCancel && (
                <button
                  onClick={() => cancelOrder(order.id)}
                  disabled={busyId === order.id}
                  className="mt-3 w-full border border-wings-red py-2 text-xs font-semibold text-wings-red disabled:opacity-40"
                >
                  {busyId === order.id ? "Membatalkan…" : "Batalkan Order"}
                </button>
              )}
              {!canCancel && order.deliveryStatus !== "cancelled" && (
                <p className="mt-2 text-[11px] text-wings-grey">
                  Order sudah dikirim — tidak dapat dibatalkan lewat aplikasi.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PembelianPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-wings-surface" />}>
      <PembelianInner />
    </Suspense>
  );
}
