"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState(DEMO_PASSWORD ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setLoading(false);
      setError("Incorrect password");
      return;
    }

    router.push(searchParams.get("next") ?? "/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-brand-border bg-brand-surface p-8 shadow-sm"
      >
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-navy text-lg font-bold text-white">
            W
          </div>
          <h1 className="text-lg font-semibold text-brand-navy">Wings Admin</h1>
          <p className="mt-1 text-sm text-brand-muted">Sign in to manage products and orders</p>
        </div>

        <label className="mb-1 block text-sm font-medium text-foreground">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          className="mb-3 w-full rounded-lg border border-brand-border px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
        />

        {DEMO_PASSWORD && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="font-medium">Demo mode</span> — password is{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">{DEMO_PASSWORD}</code>{" "}
            (pre-filled, just press Sign in).
          </div>
        )}

        {error && <p className="mb-4 text-sm text-brand-red">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-brand-navy py-2 text-sm font-medium text-white transition hover:bg-brand-navy-light disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
