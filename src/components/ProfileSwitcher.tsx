"use client";

import { useEffect, useState } from "react";
import { useProfile, writeProfile, type Profile } from "@/lib/use-profile";

type Customer = {
  id: string;
  storeName: string;
  contactName: string;
  city: string | null;
};

export default function ProfileSwitcher() {
  const { profile, ready } = useProfile();
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ storeName: "", contactName: "", phone: "", city: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && customers.length === 0) {
      fetch("/api/customers")
        .then((res) => res.json())
        .then((data) => setCustomers(data.customers));
    }
  }, [open, customers.length]);

  function choose(c: Customer) {
    const next: Profile = { id: c.id, storeName: c.storeName, contactName: c.contactName };
    writeProfile(next);
    setOpen(false);
  }

  async function createCustomer() {
    setError(null);
    if (!form.storeName.trim() || !form.contactName.trim()) {
      setError("Store name and contact name are required.");
      return;
    }
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeName: form.storeName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim() || null,
        city: form.city.trim() || null,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "Could not create store");
      return;
    }
    setCustomers((prev) => [...prev, body.customer]);
    choose(body.customer);
    setCreating(false);
    setForm({ storeName: "", contactName: "", phone: "", city: "" });
  }

  if (!ready) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white hover:bg-white/20"
      >
        <span className="max-w-[130px] truncate">
          {profile ? profile.storeName : "Select store"}
        </span>
        <span className="text-[10px]">▾</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-brand-surface p-5 sm:max-w-md sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-brand-navy">Ordering as</h2>
              <button onClick={() => setOpen(false)} className="text-sm text-brand-muted">
                Close
              </button>
            </div>

            {!creating && (
              <>
                <div className="space-y-2">
                  {customers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => choose(c)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left ${
                        profile?.id === c.id
                          ? "border-brand-navy bg-brand-navy/5"
                          : "border-brand-border hover:bg-background"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{c.storeName}</p>
                        <p className="text-xs text-brand-muted">
                          {c.contactName}
                          {c.city ? ` · ${c.city}` : ""}
                        </p>
                      </div>
                      {profile?.id === c.id && <span className="text-brand-navy">✓</span>}
                    </button>
                  ))}
                  {customers.length === 0 && (
                    <p className="text-sm text-brand-muted">Loading stores…</p>
                  )}
                </div>

                <button
                  onClick={() => setCreating(true)}
                  className="mt-3 w-full rounded-xl border border-dashed border-brand-border py-2.5 text-sm font-medium text-brand-blue hover:bg-background"
                >
                  + Add a new store
                </button>
              </>
            )}

            {creating && (
              <div className="space-y-3">
                {(
                  [
                    ["storeName", "Store name *", "e.g. Toko Melati"],
                    ["contactName", "Contact name *", "e.g. Ibu Melati"],
                    ["phone", "Phone", "+62 …"],
                    ["city", "City", "e.g. Surabaya"],
                  ] as const
                ).map(([key, label, placeholder]) => (
                  <label key={key} className="block text-xs font-medium text-brand-muted">
                    {label}
                    <input
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="mt-1 w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-foreground outline-none focus:border-brand-blue"
                    />
                  </label>
                ))}

                {error && <p className="text-xs text-brand-red">{error}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={createCustomer}
                    className="flex-1 rounded-lg bg-brand-navy py-2 text-sm font-medium text-white hover:bg-brand-navy-light"
                  >
                    Save store
                  </button>
                  <button
                    onClick={() => {
                      setCreating(false);
                      setError(null);
                    }}
                    className="rounded-lg border border-brand-border px-4 py-2 text-sm font-medium text-brand-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
