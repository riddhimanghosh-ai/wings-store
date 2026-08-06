"use client";

import { useEffect, useState } from "react";
import { DELIVERY_STAGES } from "@/lib/delivery";

type OrderItem = {
  id: string;
  rawProductName: string;
  productName: string | null;
  quantity: number;
  unit: string;
  matchConfidence: string | null;
};

type Order = {
  id: string;
  sourceType: string;
  status: string;
  deliveryStatus: string;
  customerName: string | null;
  mediaUrl: string | null;
  rawText: string;
  detectedLanguage: string | null;
  orderDate: string | null;
  notes: string | null;
  createdAt: string;
  items: OrderItem[];
};

export default function AdminTranscriptsPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  function load() {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data.orders));
  }

  useEffect(load, []);

  async function approveOrder(id: string) {
    setApprovingId(id);
    const res = await fetch(`/api/orders/${id}/approve`, { method: "POST" });
    setApprovingId(null);
    if (res.ok) load();
  }

  async function setDeliveryStatus(id: string, deliveryStatus: string) {
    const res = await fetch(`/api/admin/orders/${id}/delivery-status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryStatus }),
    });
    if (res.ok) load();
  }

  const pendingCount = orders?.filter((o) => o.status === "needs_review").length ?? 0;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold text-foreground">Transcripts &amp; audit log</h1>
      <p className="mb-6 text-sm text-wings-grey">
        Every raw OCR / voice transcript captured by the AI pipeline, for demo and QA purposes.
        {pendingCount > 0 && (
          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {pendingCount} awaiting review
          </span>
        )}
      </p>

      {orders === null && <p className="text-sm text-wings-grey">Loading…</p>}
      {orders?.length === 0 && <p className="text-sm text-wings-grey">No submissions yet.</p>}

      <div className="space-y-3">
        {orders?.map((order) => {
          const isOpen = expanded === order.id;
          return (
            <div key={order.id} className="rounded-xl border border-wings-line bg-wings-surface">
              <div className="flex w-full items-center justify-between px-4 py-3">
                <button
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  className="flex flex-1 items-center gap-3 text-left"
                >
                  <SourceBadge sourceType={order.sourceType} />
                  <span className="text-sm font-medium">
                    {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                  </span>
                  {order.detectedLanguage && (
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs text-wings-grey">
                      {order.detectedLanguage}
                    </span>
                  )}
                  <StatusBadge status={order.status} />
                </button>
                <div className="flex items-center gap-3">
                  {order.status === "needs_review" && (
                    <button
                      onClick={() => approveOrder(order.id)}
                      disabled={approvingId === order.id}
                      className="text-xs font-medium text-green-700 hover:underline disabled:opacity-50"
                    >
                      {approvingId === order.id ? "Approving…" : "Approve"}
                    </button>
                  )}
                  <span className="text-xs text-wings-grey">
                    {new Date(order.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-wings-line px-4 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <h4 className="mb-1 text-xs font-semibold uppercase text-wings-grey">
                        Raw transcript / OCR text
                      </h4>
                      <pre className="whitespace-pre-wrap rounded-lg bg-background p-3 text-xs text-foreground">
                        {order.rawText || "(empty)"}
                      </pre>

                      {order.notes && (
                        <p className="mt-2 text-xs italic text-wings-grey">Notes: {order.notes}</p>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-1 text-xs font-semibold uppercase text-wings-grey">
                        Extracted &amp; matched items
                      </h4>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-wings-grey">
                            <th className="pb-1">Raw text</th>
                            <th className="pb-1">Matched product</th>
                            <th className="pb-1">Qty</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item) => (
                            <tr key={item.id} className="border-t border-wings-line">
                              <td className="py-1 text-wings-grey">{item.rawProductName}</td>
                              <td className="py-1 font-medium">
                                {item.productName ?? (
                                  <span className="text-wings-red">unmatched</span>
                                )}
                              </td>
                              <td className="py-1">
                                {item.quantity} {item.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {order.mediaUrl && (
                        <div className="mt-3">
                          <h4 className="mb-1 text-xs font-semibold uppercase text-wings-grey">
                            Source media
                          </h4>
                          <MediaPreview sourceType={order.sourceType} mediaUrl={order.mediaUrl} />
                        </div>
                      )}
                    </div>
                  </div>

                  {order.status !== "needs_review" && (
                    <div className="mt-4 border-t border-wings-line pt-3">
                      <h4 className="mb-2 text-xs font-semibold uppercase text-wings-grey">
                        Delivery status
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {DELIVERY_STAGES.map((stage) => (
                          <button
                            key={stage.value}
                            onClick={() => setDeliveryStatus(order.id, stage.value)}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              order.deliveryStatus === stage.value
                                ? "bg-wings-red text-white"
                                : "border border-wings-line text-wings-grey hover:bg-background"
                            }`}
                          >
                            {stage.icon} {stage.label}
                          </button>
                        ))}
                        <button
                          onClick={() => setDeliveryStatus(order.id, "cancelled")}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            order.deliveryStatus === "cancelled"
                              ? "bg-red-600 text-white"
                              : "border border-wings-line text-wings-grey hover:bg-background"
                          }`}
                        >
                          ✕ Cancelled
                        </button>
                      </div>
                    </div>
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

function MediaPreview({ sourceType, mediaUrl }: { sourceType: string; mediaUrl: string }) {
  const proxyUrl = `/api/admin/media?url=${encodeURIComponent(mediaUrl)}`;
  if (sourceType === "photo") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={proxyUrl} alt="Submitted note" className="max-h-64 rounded-lg border border-wings-line" />;
  }
  return (
    <audio controls className="w-full">
      <source src={proxyUrl} />
    </audio>
  );
}

function SourceBadge({ sourceType }: { sourceType: string }) {
  const map: Record<string, string> = {
    voice: "🎤 Voice",
    photo: "📷 Photo",
    manual: "🛒 Manual PO",
  };
  return <span className="text-sm">{map[sourceType] ?? sourceType}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const isOk = status !== "needs_review";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
        isOk ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {status.replace("_", " ")}
    </span>
  );
}
