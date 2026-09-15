"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/content", label: "Content", icon: FileText },
  { href: "/media", label: "Media Library", icon: FolderOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {nav.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex h-10 items-center gap-6 rounded-lg px-3 text-sm transition-colors",
                active
                  ? "bg-zinc-900/10 font-medium text-zinc-900 dark:bg-white/10 dark:text-white"
                  : "text-zinc-900 hover:bg-zinc-900/5 dark:text-zinc-100 dark:hover:bg-white/10"
              )}
            >
              <Icon className="h-6 w-6 shrink-0" strokeWidth={1.5} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <Link
          href="/content/create"
          onClick={onNavigate}
          className="flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-900/5 text-sm font-medium text-zinc-900 hover:bg-zinc-900/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <Plus className="h-4 w-4" /> New Content
        </Link>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  // Halaman auth + privacy tampil tanpa shell dashboard.
  if (pathname === "/login" || pathname === "/privacy" || pathname.startsWith("/auth/")) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur dark:bg-[#0f0f0f]/90">
          <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                aria-label="Open menu"
                onClick={() => setOpen(true)}
                className="shrink-0 rounded-full p-2 text-zinc-600 hover:bg-zinc-900/5 md:hidden dark:text-zinc-300 dark:hover:bg-white/10"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/" className="flex min-w-0 items-center gap-2">
                <Image src="/kawaky.png" alt="KAWAKU" width={24} height={34} className="h-6 w-auto shrink-0" />
                <Image src="/kawakutext.png" alt="KAWAKU" width={96} height={20} className="hidden h-4 w-auto min-[400px]:block" />
              </Link>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/content${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
              }}
              className="flex h-10 w-[38vw] min-w-0 max-w-xl items-center"
              role="search"
            >
              <div className="flex h-full min-w-0 flex-1 items-center rounded-l-full border border-r-0 border-zinc-300 pl-4 focus-within:border-[#1c62b9] dark:border-[#303030] dark:bg-[#121212]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search content…"
                  aria-label="Search content"
                  className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-zinc-100"
                />
              </div>
              <button
                type="submit"
                aria-label="Search"
                className="flex h-full w-12 shrink-0 items-center justify-center rounded-r-full border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 sm:w-16 dark:border-[#303030] dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/20"
              >
                <Search className="h-4 w-4 shrink-0" />
              </button>
            </form>
            <div className="flex items-center justify-end gap-2">
              <Link
                href="/content/create"
                className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-900/5 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-900/10 sm:inline-flex dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                <Plus className="h-4 w-4" /> New
              </Link>
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] flex-1">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 bg-white md:block dark:bg-[#0f0f0f]">
        <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-[#0f0f0f]">
            <button
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <main
          className={cn(
            "w-full flex-1 px-4 py-6 sm:px-6 sm:py-8",
            // Analytics full-bleed selebar main (sejajar sidebar–navbar).
            pathname !== "/analytics" && "mx-auto max-w-6xl"
          )}
        >
          {children}
        </main>
      </div>
      </div>
    </div>
  );
}
