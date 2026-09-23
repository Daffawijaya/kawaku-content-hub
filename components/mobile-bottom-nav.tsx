"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  FileText,
  FolderOpen,
  House,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname.startsWith(href);
}

export function MobileBottomNav({ onCreate }: { onCreate: () => void }) {
  const pathname = usePathname();
  // Landing/auth tidak pakai shell, tapi jaga-jaga: jangan render di sana.
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/privacy" ||
    pathname.startsWith("/auth/")
  )
    return null;

  const left = [
    { href: "/dashboard", label: "Beranda", icon: House },
    { href: "/calendar", label: "Kalender", icon: CalendarDays },
  ];
  const right = [
    { href: "/content", label: "Konten", icon: FileText },
    { href: "/media", label: "Media", icon: FolderOpen },
  ];

  const itemCls = (active: boolean) =>
    cn(
      "flex min-h-[56px] min-w-[56px] flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[11px] leading-none",
      active
        ? "font-semibold text-zinc-900 dark:text-white"
        : "font-medium text-zinc-500 dark:text-zinc-400"
    );

  return (
    <nav
      aria-label="Navigasi utama mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-900/10 bg-[#fafafa]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-white/10 dark:bg-[#0f0f0f]/95"
    >
      <div className="grid grid-cols-5 items-end px-2 pt-1">
        {left.map((it) => {
          const active = isActive(pathname, it.href);
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={itemCls(active)}>
              <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
              {it.label}
            </Link>
          );
        })}

        <div className="flex justify-center px-1 pb-1">
          <button
            type="button"
            onClick={onCreate}
            aria-label="Buat konten baru"
            className="grid h-12 w-12 place-items-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform active:scale-95 dark:bg-white dark:text-zinc-900"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>

        {right.map((it) => {
          const active = isActive(pathname, it.href);
          const Icon = it.icon;
          return (
            <Link key={it.href} href={it.href} aria-current={active ? "page" : undefined} className={itemCls(active)}>
              <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
              {it.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
