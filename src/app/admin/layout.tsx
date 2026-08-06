"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/transcripts", label: "Transcripts" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b border-brand-border bg-brand-navy px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-bold text-brand-navy">
            W
          </div>
          <span className="text-sm font-semibold text-white">Wings Admin Console</span>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-md border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
        >
          Log out
        </button>
      </header>

      <div className="flex">
        <nav className="min-h-[calc(100vh-53px)] w-48 border-r border-brand-border bg-brand-surface px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 block rounded-md px-3 py-2 text-sm font-medium ${
                pathname.startsWith(item.href)
                  ? "bg-brand-navy/10 text-brand-navy"
                  : "text-brand-muted hover:bg-brand-navy/5"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
