"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, setSession } from "@/lib/wings-session";
import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

type Customer = {
  id: string;
  storeName: string;
  contactName: string;
  phone: string | null;
  city: string | null;
  address: string | null;
};

export default function AkunPage() {
  const router = useRouter();
  const { session, ready } = useSession();
  const { t } = useLang();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [fingerprint, setFingerprint] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (!ready || !session) return;
    fetch("/api/customers")
      .then((r) => r.json())
      .then((d) => {
        setAllCustomers(d.customers);
        setCustomer(d.customers.find((c: Customer) => c.id === session.id) ?? null);
      });
  }, [ready, session]);

  function logout() {
    setSession(null);
    router.replace("/masuk");
  }

  return (
    <div>
      <header className="bg-wings-red px-4 py-3.5">
        <div className="flex items-center justify-between">
          <span className="w-14" />
          <h1 className="text-base font-semibold text-white">{t("account")}</h1>
          <LangToggle onRed />
        </div>
      </header>

      <section className="bg-wings-surface px-4 py-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">{t("myProfile")}</h2>
          <button
            onClick={() => setSwitching((v) => !v)}
            className="text-xs font-semibold uppercase text-wings-red"
          >
            {t("editProfile")}
          </button>
        </div>

        <p className="text-lg font-bold uppercase text-foreground">
          {customer?.storeName ?? session?.storeName ?? "—"}
        </p>
        <p className="text-sm uppercase text-wings-grey-dark">
          {customer?.address ?? customer?.city ?? "—"}
        </p>
        <p className="text-sm text-wings-grey-dark">{customer?.phone ?? "—"}</p>

        {switching && (
          <div className="mt-3 space-y-1.5 border-t border-wings-line pt-3">
            <p className="text-xs text-wings-grey">{t("chooseStore")}</p>
            {allCustomers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setSession({ id: c.id, storeName: c.storeName, contactName: c.contactName });
                  setCustomer(c);
                  setSwitching(false);
                }}
                className={`flex w-full items-center justify-between border px-3 py-2 text-left text-sm ${
                  c.id === session?.id
                    ? "border-wings-red bg-wings-red/5"
                    : "border-wings-line"
                }`}
              >
                <span>
                  {c.storeName}
                  <span className="ml-1 text-xs text-wings-grey">{c.city}</span>
                </span>
                {c.id === session?.id && <span className="text-wings-red">✓</span>}
              </button>
            ))}
          </div>
        )}
      </section>

      <Section title={t("purchases")}>
        <RowLink href="/pembelian" label={t("transactionList")} />
      </Section>

      <Section title={t("information")}>
        <RowLink href="/pembelian" label={t("achievements")} />
        <RowLink href="/akun" label={t("rateApp")} />
        <RowLink href="/akun" label={t("customerService")} />
      </Section>

      <Section title={t("settings")}>
        <div className="flex items-center justify-between border-b border-wings-line px-4 py-3.5">
          <span className="text-sm text-foreground">{t("fingerprintLogin")}</span>
          <button
            onClick={() => setFingerprint((v) => !v)}
            aria-label={t("fingerprintLogin")}
            className={`relative h-6 w-11 rounded-full transition ${
              fingerprint ? "bg-wings-red" : "bg-wings-line"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                fingerprint ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
        <RowLink href="/admin" label={t("adminConsole")} />
      </Section>

      <div className="px-4 py-6">
        <button
          onClick={logout}
          className="w-full border border-wings-red py-3 text-sm font-semibold text-wings-red"
        >
          {t("logout")}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-2 bg-wings-surface">
      <h3 className="px-4 pt-3 pb-1 text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function RowLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between border-b border-wings-line px-4 py-3.5 text-sm text-wings-grey-dark"
    >
      {label}
      <span className="text-wings-grey">›</span>
    </Link>
  );
}
