"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setSession } from "@/lib/wings-session";
import { useLang } from "@/lib/i18n";
import LangToggle from "@/components/LangToggle";

/**
 * Demo credentials. The username matches a seeded store; any password is
 * accepted because there is no real customer auth backend yet.
 */
const DEMO_USERNAME = "Toko Sinar Abadi";
const DEMO_PASSWORD = "wings123";

type Customer = {
  id: string;
  storeName: string;
  contactName: string;
  city?: string | null;
};

function normalise(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, "");
}

export default function MasukPage() {
  const router = useRouter();
  const { t } = useLang();
  const [username, setUsername] = useState(DEMO_USERNAME);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Seeded stores, for the demo picker. null = still loading.
  const [stores, setStores] = useState<Customer[] | null>(null);
  // If the list cannot be loaded we fall back to a free-text field rather than
  // leaving an empty dropdown, which would make signing in impossible.
  const [pickerFailed, setPickerFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/customers")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then(({ customers }: { customers: Customer[] }) => {
        if (cancelled) return;
        if (!customers?.length) {
          setPickerFailed(true);
          return;
        }
        setStores(customers);
        // Keep the demo store preselected when it is present, otherwise start
        // on whichever store sorts first so the form is always valid.
        if (!customers.some((c) => normalise(c.storeName) === normalise(DEMO_USERNAME))) {
          setUsername(customers[0].storeName);
        }
      })
      .catch(() => {
        if (!cancelled) setPickerFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const canSubmit = username.trim().length > 0 && password.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);

    // Already loaded for the picker in the common case; only the text-input
    // fallback has to go to the network here.
    let list = stores;
    if (!list) {
      try {
        const res = await fetch(`/api/customers`);
        list = (await res.json()).customers as Customer[];
      } catch {
        setLoading(false);
        setError(t("wrongCredentials"));
        return;
      }
    }

    // Demo auth: the username is the store code, any password is accepted.
    const match = list.find((c) => normalise(c.storeName) === normalise(username)) ?? list[0];

    setLoading(false);

    if (!match) {
      setError(t("wrongCredentials"));
      return;
    }

    setSession({ id: match.id, storeName: match.storeName, contactName: match.contactName });
    router.push("/onboarding");
  }

  return (
    <main className="flex min-h-screen flex-col bg-wings-red px-6 pb-8 pt-12">
      <div className="mb-6 flex justify-end">
        <LangToggle onRed />
      </div>

      <div className="mb-8">
        <p className="text-2xl font-light text-white">{t("welcomeTo")}</p>
        <h1 className="text-3xl font-bold text-white">Wings Online</h1>
      </div>

      <form onSubmit={handleSubmit} className="rounded-md bg-[#f5f5f5] p-6 shadow-lg">
        <div className="mb-5 flex items-center gap-3 border-b border-wings-line pb-1">
          <span className="text-lg text-wings-grey">👤</span>
          {pickerFailed ? (
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("username")}
              autoCapitalize="none"
              className="w-full bg-transparent py-1.5 text-base outline-none placeholder:text-wings-grey"
            />
          ) : (
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={!stores}
              aria-label={t("selectStore")}
              className="w-full appearance-none bg-transparent py-1.5 text-base outline-none disabled:text-wings-grey"
            >
              {stores ? (
                stores.map((store) => (
                  <option key={store.id} value={store.storeName}>
                    {store.storeName}
                    {store.city ? ` — ${store.city}` : ""}
                  </option>
                ))
              ) : (
                <option value={username}>{t("loadingStores")}</option>
              )}
            </select>
          )}
          {!pickerFailed && (
            <span aria-hidden className="pointer-events-none text-xs text-wings-grey">
              ▾
            </span>
          )}
        </div>

        <div className="mb-4 flex items-center gap-3 border-b border-wings-line pb-1">
          <span className="text-lg text-wings-grey">🔑</span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("password")}
            className="w-full bg-transparent py-1.5 text-base outline-none placeholder:text-wings-grey"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={t("password")}
            className="text-wings-grey"
          >
            {showPassword ? "🙈" : "👁"}
          </button>
        </div>

        <label className="mb-5 flex items-center gap-2 text-sm text-wings-grey-dark">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-wings-red"
          />
          {t("rememberMe")}
        </label>

        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
          <span className="font-semibold">{t("demoMode")}</span> —{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">{DEMO_USERNAME}</code>{" "}
          / <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">{DEMO_PASSWORD}</code>{" "}
          <span className="italic">({t("demoAnyPassword")})</span> {t("demoLoginHint")}
        </div>

        {error && <p className="mb-3 text-sm text-wings-red">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          className={`mb-4 w-full py-3 text-base font-medium tracking-wide text-white transition ${
            canSubmit && !loading ? "bg-wings-red hover:bg-wings-red-dark" : "bg-wings-disabled"
          }`}
        >
          {loading ? t("signingIn") : t("signIn")}
        </button>

        <div className="flex items-center justify-between text-sm">
          <Link href="/register-akun" className="text-wings-grey-dark">
            {t("registerAccount")}
          </Link>
          <Link href="/lupa-password" className="text-wings-grey-dark">
            {t("forgotPassword")}
          </Link>
        </div>
      </form>

      <div className="mt-auto pt-8 text-center text-sm text-white">
        {t("needHelp")} <span className="font-semibold">{t("contactSupport")}</span>
      </div>
    </main>
  );
}
