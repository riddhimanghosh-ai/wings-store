import { DELIVERY_STAGES, deliveryStageIndex } from "@/lib/delivery";

export default function DeliveryStepper({ status }: { status: string }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
        Order cancelled
      </div>
    );
  }

  const currentIndex = deliveryStageIndex(status);

  return (
    <div className="flex items-center">
      {DELIVERY_STAGES.map((stage, i) => {
        const done = i <= currentIndex;
        const isLast = i === DELIVERY_STAGES.length - 1;
        return (
          <div key={stage.value} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                  done ? "bg-brand-navy text-white" : "bg-background text-brand-muted"
                }`}
              >
                {done ? "✓" : stage.icon}
              </div>
              <span
                className={`w-16 text-center text-[10px] leading-tight ${
                  done ? "font-medium text-brand-navy" : "text-brand-muted"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {!isLast && (
              <div className={`mx-1 mb-4 h-0.5 flex-1 ${done ? "bg-brand-navy" : "bg-brand-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
