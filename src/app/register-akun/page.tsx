"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WingsAuthHeader from "@/components/WingsAuthHeader";

export default function RegisterAkunPage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [salesGroup, setSalesGroup] = useState("");
  const [phone, setPhone] = useState("");
  const [otpChannel, setOtpChannel] = useState<"sms" | "whatsapp">("sms");

  const canSubmit = customerId.trim() && salesGroup.trim() && phone.trim();

  return (
    <main className="min-h-screen bg-wings-surface">
      <WingsAuthHeader title="Register Akun" />

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
            placeholder="Customer ID"
            className="wings-underline-input"
          />
          <p className="mt-1.5 text-xs text-wings-grey">
            Kode customer Wings, tertera di nota pembelian. Diawali WS untuk area Wings Surya.
          </p>
        </div>

        <div className="mb-7">
          <input
            value={salesGroup}
            onChange={(e) => setSalesGroup(e.target.value.toUpperCase())}
            placeholder="Code Sales Group"
            className="wings-underline-input"
          />
          <p className="mt-1.5 text-xs text-wings-grey">Kode supervisor yang meng-cover toko Anda.</p>
        </div>

        <div className="mb-7">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="No. Handphone Customer"
            inputMode="tel"
            className="wings-underline-input"
          />
        </div>

        <p className="mb-3 text-sm text-foreground">Pilih pengiriman OTP</p>
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
          Tidak Tahu Customer ID? <span className="text-wings-red">Hubungi Sales</span>
        </p>

        <button
          type="submit"
          disabled={!canSubmit}
          className={`w-full py-3 text-base font-semibold tracking-wide text-white ${
            canSubmit ? "bg-wings-red hover:bg-wings-red-dark" : "bg-wings-disabled"
          }`}
        >
          KIRIM
        </button>

        <p className="mt-4 text-center text-xs text-wings-grey">
          <span className="text-wings-red">Klik disini untuk hubungi kami</span> — khusus wilayah
          Jakarta, Jawa Barat, dan Sumatera.
        </p>
      </form>
    </main>
  );
}
