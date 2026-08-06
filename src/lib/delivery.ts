export const DELIVERY_STAGES = [
  { value: "placed", label: "Order placed", icon: "🧾" },
  { value: "packed", label: "Packed", icon: "📦" },
  { value: "out_for_delivery", label: "Out for delivery", icon: "🛵" },
  { value: "delivered", label: "Delivered", icon: "✅" },
] as const;

export function deliveryStageIndex(status: string) {
  return DELIVERY_STAGES.findIndex((s) => s.value === status);
}

export function nextDeliveryStatus(status: string) {
  const idx = deliveryStageIndex(status);
  if (idx === -1 || idx === DELIVERY_STAGES.length - 1) return null;
  return DELIVERY_STAGES[idx + 1].value;
}
