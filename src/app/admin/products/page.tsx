"use client";

import { useEffect, useMemo, useState } from "react";
import { formatIdr, categoryLabel, CATEGORY_LABELS } from "@/lib/format";

type Product = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  priceIdr: number;
  discountMinQty: number | null;
  discountPercent: number | null;
  aliases: string[];
};

type FormState = {
  sku: string;
  name: string;
  brand: string;
  category: string;
  unit: string;
  priceIdr: string;
  discountMinQty: string;
  discountPercent: string;
  aliases: string;
};

const EMPTY_FORM: FormState = {
  sku: "",
  name: "",
  brand: "",
  category: "household",
  unit: "pcs",
  priceIdr: "",
  discountMinQty: "",
  discountPercent: "",
  aliases: "",
};

function toFormState(p: Product): FormState {
  return {
    sku: p.sku,
    name: p.name,
    brand: p.brand,
    category: p.category,
    unit: p.unit,
    priceIdr: String(p.priceIdr),
    discountMinQty: p.discountMinQty?.toString() ?? "",
    discountPercent: p.discountPercent?.toString() ?? "",
    aliases: p.aliases.join(", "),
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.products));
  }

  useEffect(load, []);

  const grouped = useMemo(() => {
    if (!products) return [];
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return Array.from(map.entries());
  }, [products]);

  function startEdit(p: Product) {
    setEditingId(p.id);
    setForm(toFormState(p));
    setError(null);
  }

  function startNew() {
    setEditingId("new");
    setForm(EMPTY_FORM);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category,
      unit: form.unit.trim(),
      priceIdr: Number(form.priceIdr) || 0,
      discountMinQty: form.discountMinQty ? Number(form.discountMinQty) : null,
      discountPercent: form.discountPercent ? Number(form.discountPercent) : null,
      aliases: form.aliases
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
    };

    const url = editingId === "new" ? "/api/admin/products" : `/api/admin/products/${editingId}`;
    const method = editingId === "new" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to save product");
      return;
    }

    setEditingId(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Products</h1>
          <p className="text-sm text-wings-grey">
            {products?.length ?? 0} SKUs across {grouped.length} categories
          </p>
        </div>
        <button
          onClick={startNew}
          className="rounded-lg bg-wings-red px-4 py-2 text-sm font-medium text-white hover:bg-wings-red-dark"
        >
          + Add product
        </button>
      </div>

      {editingId && (
        <div className="mb-6 rounded-xl border border-wings-line bg-wings-surface p-5">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            {editingId === "new" ? "New product" : "Edit product"}
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="SKU">
              <input className="input" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </Field>
            <Field label="Name">
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Brand">
              <input className="input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </Field>
            <Field label="Category">
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Unit">
              <input className="input" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </Field>
            <Field label="Price (IDR)">
              <input
                className="input"
                type="number"
                value={form.priceIdr}
                onChange={(e) => setForm({ ...form, priceIdr: e.target.value })}
              />
            </Field>
            <Field label="Discount min qty">
              <input
                className="input"
                type="number"
                value={form.discountMinQty}
                onChange={(e) => setForm({ ...form, discountMinQty: e.target.value })}
                placeholder="e.g. 20"
              />
            </Field>
            <Field label="Discount %">
              <input
                className="input"
                type="number"
                value={form.discountPercent}
                onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                placeholder="e.g. 5"
              />
            </Field>
            <Field label="Aliases (comma separated)">
              <input
                className="input"
                value={form.aliases}
                onChange={(e) => setForm({ ...form, aliases: e.target.value })}
              />
            </Field>
          </div>

          {error && <p className="mt-3 text-sm text-wings-red">{error}</p>}

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-wings-red px-4 py-2 text-sm font-medium text-white hover:bg-wings-red-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              className="rounded-lg border border-wings-line px-4 py-2 text-sm font-medium text-wings-grey hover:bg-background"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {products === null && <p className="text-sm text-wings-grey">Loading…</p>}

      {grouped.map(([category, items]) => (
        <div key={category} className="mb-6">
          <h3 className="mb-2 text-sm font-semibold text-wings-grey">{categoryLabel(category)}</h3>
          <div className="overflow-hidden rounded-xl border border-wings-line bg-wings-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-wings-line bg-background text-left text-xs uppercase text-wings-grey">
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Brand</th>
                  <th className="px-4 py-2">Unit</th>
                  <th className="px-4 py-2">Price</th>
                  <th className="px-4 py-2">Discount</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id} className="border-b border-wings-line last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-wings-grey">{p.sku}</td>
                    <td className="px-4 py-2 font-medium">{p.name}</td>
                    <td className="px-4 py-2 text-wings-grey">{p.brand}</td>
                    <td className="px-4 py-2 text-wings-grey">{p.unit}</td>
                    <td className="px-4 py-2">{formatIdr(p.priceIdr)}</td>
                    <td className="px-4 py-2">
                      {p.discountMinQty && p.discountPercent ? (
                        <span className="rounded-full bg-wings-orange/15 px-2 py-0.5 text-xs font-medium text-wings-orange">
                          {p.discountPercent}% off {p.discountMinQty}+
                        </span>
                      ) : (
                        <span className="text-xs text-wings-grey">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => startEdit(p)} className="mr-3 text-xs font-medium text-wings-red hover:underline">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="text-xs font-medium text-wings-red hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid var(--wings-line);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 13px;
          outline: none;
        }
        .input:focus {
          border-color: var(--wings-red);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-wings-grey">{label}</span>
      {children}
    </label>
  );
}
