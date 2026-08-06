"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WingsAuthHeader from "@/components/WingsAuthHeader";
import { useLang } from "@/lib/i18n";

export default function RegisterAkunPage() {
  const router = useRouter();
  const { t } = useLang();
  const [customerId, setCustomerId] = useState("");
  const [salesGroup, setSalesGroup] = useState("");
  const [phone, setPhone] = useState("");
  const [otpChannel, setOtpChannel] = useState<"sms" | "whatsapp">("sms");

  const canSubmit = customerId.trim() && salesGroup.trim() && phone.trim();

  return (
    <main className="min-h-screen bg-wings-surface">
      <WingsAuthHeader title={t("registerAccount")} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) router.push("/pertanyaan-keamanan");
        }}
        className="px-5 pt-4"
      >
        <div className="mb-7">
          <input
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value.toUpperCase())}
            placeholder={t("customerId")}
            className="wings-underline-input"
          />
          <p className="mt-1.5 text-xs text-wings-grey">
            {t("customerIdHint")}
          </p>
        </div>

        <div className="mb-7">
          <input
            value={salesGroup}
            onChange={(e) => setSalesGroup(e.target.value.toUpperCase())}
            placeholder={t("salesGroupCode")}
            className="wings-underline-input"
          />
          <p className="mt-1.5 text-xs text-wings-grey">{t("salesGroupHint")}</p>
        </div>

        <div className="mb-7">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("customerPhone")}
            inputMode="tel"
            className="wings-underline-input"
          />
        </div>

        <p className="mb-3 text-sm text-foreground">{t("chooseOtp")}</p>
        <div className="mb-7 flex gap-8">
          {(
            [
              ["sms", "SMS"],
              ["whatsapp", "WhatsApp"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="otp"
                checked={otpChannel === value}
                onChange={() => setOtpChannel(value)}
                className="h-4 w-4 accent-wings-red"
              />
              {label}
            </label>
          ))}
        </div>

        <p className="mb-6 text-sm italic text-wings-grey">
          {t("dontKnowId")} <span className="text-wings-red">{t("contactSales")}</span>
        </p>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-3 text-base font-semibold tracking-wide text-white ${
            canSubmit ? "bg-wings-red hover:bg-wings-red-dark" : "bg-wings-disabled"
          }`}
        >
          {t("send")}
        </button>

        <p className="mt-4 text-center text-xs text-wings-grey">
          <span className="text-wings-red">{t("regionNote")}</span> {t("regionNoteTail")}
        </p>
      </form>
    </main>
  );
}
