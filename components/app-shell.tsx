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
import { Button } from "@/components/ui/button";

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
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2.5 px-5 pt-6 pb-5">
        <Image src="/kawaky.png" alt="KAWAKU" width={32} height={46} className="h-8 w-auto" />
        <span className="leading-tight">
          <Image src="/kawakutext.png" alt="KAWAKU" width={120} height={25} className="h-5 w-auto" />
          <span className="block text-xs text-zinc-500">Content Hub</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 px-3">
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
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4">
        <Link href="/content/create" onClick={onNavigate}>
          <Button className="w-full">
            <Plus className="h-4 w-4" /> New Content
          </Button>
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
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white md:block dark:border-zinc-800 dark:bg-zinc-950">
        <div className="sticky top-0 h-screen">
          <SidebarContent />
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white dark:bg-zinc-950">
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
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur dark:bg-[#0f0f0f]/90">
          <div className="flex h-14 items-center gap-2 px-4">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="rounded-full p-2 text-zinc-600 hover:bg-zinc-900/5 md:hidden dark:text-zinc-300 dark:hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Penyeimbang agar search truly center di desktop */}
            <div className="hidden w-[172px] shrink-0 md:block" />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/content${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
              }}
              className="mx-auto flex h-10 w-full max-w-xl min-w-0 flex-1 items-center"
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
                className="flex h-full w-14 shrink-0 items-center justify-center rounded-r-full border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 sm:w-16 dark:border-[#303030] dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/20"
              >
                <Search className="h-4 w-4 shrink-0" />
              </button>
            </form>
            <div className="ml-auto flex shrink-0 items-center gap-2">
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
  );
}
