"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  FileText,
  FolderOpen,
  House,
  Menu,
  Plus,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateModal } from "@/components/create-modal";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

const navGroups: { title?: string; items: { href: string; label: string; icon: typeof House }[] }[] = [
  {
    items: [
      { href: "/dashboard", label: "Beranda", icon: House },
      { href: "/calendar", label: "Kalender", icon: CalendarDays },
      { href: "/content", label: "Konten", icon: FileText },
      { href: "/media", label: "Media", icon: FolderOpen },
      { href: "/analytics", label: "Analitik", icon: BarChart3 },
    ],
  },
  {
    title: "Tim",
    items: [
      { href: "/team", label: "Tim", icon: Users },
      { href: "/settings", label: "Pengaturan", icon: Settings },
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
                  item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
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
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  // Navbar transparan di posisi top, transisi smooth ke solid saat scroll.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 8));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  // Detail konten (/content/<id>) ikut full-bleed; create/board/edit tidak.
  const isContentDetail =
    /^\/content\/[^/]+$/.test(pathname) &&
    pathname !== "/content/create" &&
    pathname !== "/content/board";
  // Halaman auth + privacy + landing tampil tanpa shell dashboard.
  if (pathname === "/" || pathname === "/login" || pathname === "/privacy" || pathname.startsWith("/auth/")) return <>{children}</>;
  return (
    <div className="flex min-h-screen flex-col">
      <header
        className={cn(
          "sticky top-0 z-30 transition-colors duration-300",
          scrolled ? "bg-[#fafafa]/90 backdrop-blur dark:bg-[#0f0f0f]/90" : "bg-transparent"
        )}
      >
          <div className="grid h-14 grid-cols-[1fr_auto] items-center gap-2 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
            {/* Kiri mobile & desktop: hanya logo (tanpa hamburger).
                Menu mobile pindah ke avatar profil + bottom nav. */}
            <div className="flex min-w-0 items-center gap-4">
              <button
                aria-label={collapsed ? "Bentangkan sidebar" : "Lipatkan sidebar"}
                onClick={() => setCollapsed((c) => !c)}
                className="-ml-2 hidden shrink-0 rounded-full p-2 text-zinc-600 hover:bg-zinc-900/5 md:block dark:text-zinc-300 dark:hover:bg-white/10"
              >
                <Menu className="h-5 w-5" />
              </button>
              <Link href="/dashboard" className="flex min-w-0 items-center gap-2">
                <Image src="/kawaky.png" alt="KAWAKU" width={24} height={34} className="h-6 w-auto shrink-0" />
                <Image src="/kawakutext.png" alt="KAWAKU" width={96} height={20} className="h-4 w-auto" />
              </Link>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                router.push(`/content${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
              }}
              className="hidden h-10 w-[38vw] min-w-0 max-w-xl items-center md:flex"
              role="search"
            >
              <div className="flex h-full min-w-0 flex-1 items-center rounded-l-full border border-r-0 border-zinc-300 pl-4 focus-within:border-[#1c62b9] dark:border-[#303030] dark:bg-[#121212]">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                   placeholder="Cari konten…"
                   aria-label="Cari konten"
                  className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-zinc-100"
                />
              </div>
              <button
                type="submit"
                 aria-label="Cari"
                className="flex h-full w-12 shrink-0 items-center justify-center rounded-r-full border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 sm:w-16 dark:border-[#303030] dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/20"
              >
                <Search className="h-4 w-4 shrink-0" />
              </button>
            </form>
            <div className="flex items-center justify-end gap-1 sm:gap-2">
              <button
                type="button"
                aria-label={mobileSearchOpen ? "Tutup pencarian" : "Buka pencarian"}
                aria-expanded={mobileSearchOpen}
                onClick={() => setMobileSearchOpen((v) => !v)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-600 hover:bg-zinc-900/5 md:hidden dark:text-zinc-300 dark:hover:bg-white/10"
              >
                {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="hidden h-9 items-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-900/5 px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-900/10 sm:inline-flex dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
              >
                <Plus className="h-4 w-4" /> Baru
              </button>
              {/* Toggle tema hanya desktop; di mobile pindah ke Pengaturan > Tampilan. */}
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              <UserMenu />
            </div>
          </div>
          {mobileSearchOpen && (
            <div className="border-t border-zinc-900/10 px-4 pb-3 pt-2 md:hidden dark:border-white/10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setMobileSearchOpen(false);
                  router.push(`/content${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
                }}
                className="flex h-11 w-full items-center"
                role="search"
              >
                <div className="flex h-full min-w-0 flex-1 items-center rounded-l-full border border-r-0 border-zinc-300 pl-4 focus-within:border-[#1c62b9] dark:border-[#303030] dark:bg-[#121212]">
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setMobileSearchOpen(false);
                    }}
                    placeholder="Cari konten…"
                    aria-label="Cari konten"
                    className="w-full bg-transparent text-[16px] text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-zinc-100"
                  />
                </div>
                <button
                  type="submit"
                  aria-label="Cari"
                  className="flex h-full w-14 shrink-0 items-center justify-center rounded-r-full border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-[#303030] dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/20"
                >
                  <Search className="h-4 w-4 shrink-0" />
                </button>
              </form>
            </div>
          )}
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] flex-1">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden shrink-0 bg-[#fafafa] transition-[width] duration-300 ease-out md:block dark:bg-[#0f0f0f]",
          collapsed ? "w-[72px]" : "w-60"
        )}
      >
        <div className="sticky top-14 h-[calc(100vh-3.5rem)]">
          <SidebarContent collapsed={collapsed} />
        </div>
      </aside>

      {/* Navigasi mobile: bottom nav + menu profil (tanpa drawer/hamburger). */}

      <div className="flex min-w-0 flex-1 flex-col pb-[76px] md:pb-0">
        <main
          className={cn(
            "w-full flex-1 px-4 py-6 sm:px-6 sm:py-8",
            // Full-bleed: analytics + dashboard + calendar + content (+ detail/create/board) + media + team + settings.
            (pathname !== "/analytics" &&
              pathname !== "/dashboard" &&
              pathname !== "/calendar" &&
              pathname !== "/content" &&
              pathname !== "/content/create" &&
              pathname !== "/content/board" &&
              pathname !== "/media" &&
              pathname !== "/team" &&
              pathname !== "/settings" &&
              !isContentDetail) &&
              "mx-auto max-w-6xl"
          )}
        >
          {children}
        </main>
      </div>
      </div>
      <MobileBottomNav onCreate={() => setCreateOpen(true)} />
      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          setCreateOpen(false);
          router.push(`/content/${id}`);
        }}
      />
    </div>
  );
}
