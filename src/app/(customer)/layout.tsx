"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import ChatWidget from "@/components/ChatWidget";

const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/browse", label: "Browse", icon: "🛒" },
  { href: "/orders", label: "My Orders", icon: "📋" },
  { href: "/admin", label: "Admin", icon: "🔐" },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center gap-2 border-b border-brand-border bg-brand-navy px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-bold text-brand-navy">
          W
        </div>
        <span className="flex-1 text-sm font-semibold text-white">Wings Order Assistant</span>
        <ProfileSwitcher />
      </header>

      <div className="flex-1 pb-16">{children}</div>

      <ChatWidget />

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-brand-border bg-brand-surface">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                active ? "text-brand-red" : "text-brand-muted"
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
