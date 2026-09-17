"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
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

const navGroups: { title?: string; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/content", label: "Content", icon: FileText },
      { href: "/media", label: "Media Library", icon: FolderOpen },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "Tim",
    items: [
      { href: "/team", label: "Team", icon: Users },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function SidebarContent({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <nav className="min-h-0 flex-1 overflow-y-auto px-3">
        {navGroups.map((group) => (
          <div
            key={group.title ?? "menu"}
            className="border-t border-zinc-900/10 py-3 first:border-t-0 first:pt-3 dark:border-white/10"
          >
            {group.title && (
              <p
                className={cn(
                  "grid px-3 pb-1 transition-[grid-template-columns,opacity] duration-300 ease-out",
                  collapsed ? "grid-cols-[0fr] opacity-0" : "grid-cols-[1fr] opacity-100"
                )}
              >
                <span className="flex items-center gap-1 overflow-hidden whitespace-nowrap text-[15px] font-medium text-zinc-900 dark:text-white">
                  {group.title}
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" />
                </span>
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex h-10 items-center gap-6 rounded-lg px-3 text-[13px] transition-colors",
                      active
                        ? "bg-zinc-900/10 font-medium text-zinc-900 dark:bg-white/10 dark:text-white"
                        : "text-zinc-900 hover:bg-zinc-900/5 dark:text-zinc-100 dark:hover:bg-white/10"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
                    {/* Label selalu ter-mount: track 0fr->1fr + overflow-hidden = animasi wipe mulus, icon tidak bergeser */}
                    <span
                      className={cn(
                        "grid min-w-0 whitespace-nowrap transition-[grid-template-columns,opacity] duration-300 ease-out",
                        collapsed ? "grid-cols-[0fr] opacity-0" : "grid-cols-[1fr] opacity-100"
                      )}
                    >
                      <span className="overflow-hidden">{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3">
        <Link
          href="/content/create"
          onClick={onNavigate}
          title="New Content"
          className="flex h-10 w-full items-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-900/5 px-3.5 text-sm font-medium text-zinc-900 hover:bg-zinc-900/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span
            className={cn(
              "grid min-w-0 transition-[grid-template-columns,opacity] duration-300 ease-out",
              collapsed ? "grid-cols-[0fr] opacity-0" : "grid-cols-[1fr] opacity-100"
            )}
          >
            <span className="overflow-hidden">New Content</span>
          </span>
        </Link>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  // Halaman auth + privacy tampil tanpa shell dashboard.
  if (pathname === "/login" || pathname === "/privacy" || pathname.startsWith("/auth/")) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur dark:bg-[#0f0f0f]/90">
          <div className="grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 sm:px-6">
            {/* Icon hamburger sejajar icon sidebar (center 34px): -ml-2 kompensasi p-2 tombol.
                Jarak icon hamburger→logo (sisa p-2 8px + gap-4 16px = 24px) = jarak icon→teks sidebar (gap-6).
                Lingkaran hover simetris di sekeliling icon sehingga tidak menggeser posisi icon. */}
            <div className="flex min-w-0 items-center gap-4">
              <button
                aria-label="Open menu"
                onClick={() => setOpen(true)}
                className="shrink-0 rounded-full p-2 text-zinc-600 hover:bg-zinc-900/5 md:hidden dark:text-zinc-300 dark:hover:bg-white/10"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setCollapsed((c) => !c)}
                className="-ml-2 hidden shrink-0 rounded-full p-2 text-zinc-600 hover:bg-zinc-900/5 md:block dark:text-zinc-300 dark:hover:bg-white/10"
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
      <aside
        className={cn(
          "hidden shrink-0 bg-white transition-[width] duration-300 ease-out md:block dark:bg-[#0f0f0f]",
          collapsed ? "w-[72px]" : "w-60"
        )}
      >
        <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
          <SidebarContent collapsed={collapsed} />
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
            // Full-bleed: analytics + dashboard + calendar + content (+ create/board).
            pathname !== "/analytics" &&
              pathname !== "/" &&
              pathname !== "/calendar" &&
              pathname !== "/content" &&
              pathname !== "/content/create" &&
              pathname !== "/content/board" &&
              "mx-auto max-w-6xl"
          )}
        >
          {children}
        </main>
      </div>
      </div>
    </div>
  );
}
