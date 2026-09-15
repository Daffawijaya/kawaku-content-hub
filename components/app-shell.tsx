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
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="rounded-md p-2 text-zinc-600 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <Menu className="h-4 w-4" />
            </button>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/content${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
              }}
              className="hidden items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm text-zinc-500 sm:flex sm:w-72 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search content…"
                aria-label="Search content"
                className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </form>
            <div className="ml-auto flex items-center gap-1">
              <ThemeToggle />
              <Link href="/content/create" className="hidden sm:block">
                <Button size="sm">
                  <Plus className="h-4 w-4" /> New
                </Button>
              </Link>
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
