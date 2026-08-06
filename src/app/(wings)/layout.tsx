"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession, hasOnboarded } from "@/lib/wings-session";
import { useCart } from "@/lib/wings-cart";
import ChatWidget from "@/components/ChatWidget";

const TABS = [
  { href: "/", label: "Beranda", icon: "⌂" },
  { href: "/pembelian", label: "Pembelian", icon: "▣" },
  { href: "/keranjang", label: "Keranjang", icon: "🛒" },
  { href: "/akun", label: "Akun", icon: "☺" },
];

export default function WingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready } = useSession();
  const { itemCount } = useCart();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace("/masuk");
    else if (!hasOnboarded()) router.replace("/onboarding");
  }, [ready, session, router]);

  if (!ready || !session) {
    return <div className="min-h-screen bg-wings-surface" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex-1 pb-16">{children}</div>

      <ChatWidget />

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-wings-line bg-wings-surface">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
                active ? "font-semibold text-wings-red" : "text-wings-grey"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
              {tab.href === "/keranjang" && itemCount > 0 && (
                <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-wings-red px-1 text-[10px] font-semibold text-white">
                  {itemCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
