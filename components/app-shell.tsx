"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  ArrowLeft,
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
  // true selama animasi tutup berjalan (row search masih ter-mount untuk morph balik).
  const [mobileSearchClosing, setMobileSearchClosing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  // Tutup search mobile lewat animasi kebalikan: row search tetap ter-mount
  // sampai morph pill → ikon selesai (lihat onExitComplete di AnimatePresence).
  const closeMobileSearch = () => {
    setMobileSearchClosing(true);
    setMobileSearchOpen(false);
  };
  // Fokus input search mobile sedikit ditunda agar keyboard muncul
  // setelah morph expand dari ikon mulai jalan (tidak patah).
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!mobileSearchOpen) return;
    const t = setTimeout(() => searchInputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [mobileSearchOpen]);
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
          "sticky top-0 z-30 min-h-14 transition-colors duration-300",
          scrolled ? "bg-[#fafafa]/90 backdrop-blur dark:bg-[#0f0f0f]/90" : "bg-transparent"
        )}
      >
        <MotionConfig reducedMotion="user">
          {/* Baris normal: logo + aksi. Saat search mobile aktif, baris ini
              sembunyi di mobile (desktop/md tetap tampil seperti semula). */}
          <div
            className={cn(
              "h-14 items-center gap-2 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr]",
              mobileSearchOpen ? "hidden md:grid" : "grid grid-cols-[1fr_auto]"
            )}
          >
            {/* Kiri mobile & desktop: hanya logo (tanpa hamburger).
                Menu mobile pindah ke avatar profil + bottom nav. */}
            {/* Isi baris normal muncul balik dengan fade saat pill search menutup,
                biar tidak "pop" di belakang pill yang masih memudar. */}
            <motion.div
              animate={{ opacity: mobileSearchClosing ? [0, 1] : 1 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex min-w-0 items-center gap-4"
            >
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
            </motion.div>
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
            <motion.div
              animate={{ opacity: mobileSearchClosing ? [0, 1] : 1 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex items-center justify-end gap-1 sm:gap-2"
            >
              {/* Asal morph expand: lingkaran ikon ini mekar menjadi pill
                  search (layoutId sama dengan form di bawah). */}
              {!mobileSearchOpen && (
                <button
                  type="button"
                  aria-label="Buka pencarian"
                  onClick={() => {
                    setMobileSearchClosing(false);
                    setMobileSearchOpen(true);
                  }}
                  className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-600 hover:bg-zinc-900/5 md:hidden dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  <motion.span
                    layoutId="mobile-search-pill"
                    transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                    className="absolute inset-0 rounded-full"
                    style={{ borderRadius: 999 }}
                  />
                  <Search className="relative h-5 w-5" />
                </button>
              )}
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
            </motion.div>
          </div>
          {/* Mode search mobile ala YouTube: header berganti jadi
              [tombol kembali] + [kolom search full + tombol cari].
              Hanya mobile (md:hidden); desktop tak tersentuh.
              AnimatePresence menahan row ini selama animasi tutup supaya pill
              bisa menyusut balik ke lingkaran ikon (morph kebalikan dari saat buka).
              exit durasinya = durasi morph (0.28s) + absolut top-0 agar baris
              normal yang muncul kembali tidak mendorong pill turun. */}
          <AnimatePresence initial={false} onExitComplete={() => setMobileSearchClosing(false)}>
            {mobileSearchOpen && (
              <motion.div
                key="mobile-search"
                exit={{ opacity: 1, transition: { duration: 0.28 } }}
                className="absolute inset-x-0 top-0 flex h-14 items-center gap-1 px-2 sm:px-4 md:hidden"
              >
                <motion.button
                  type="button"
                  aria-label="Kembali"
                  onClick={closeMobileSearch}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-zinc-600 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/10"
                >
                  <ArrowLeft className="h-5 w-5" />
                </motion.button>
                {/* Tujuan morph: pill search mengembang dari lingkaran ikon. */}
                <motion.form
                  layoutId="mobile-search-pill"
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                  style={{ borderRadius: 999 }}
                  onSubmit={(e) => {
                    e.preventDefault();
                    closeMobileSearch();
                    router.push(`/content${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`);
                  }}
                  className="flex h-10 min-w-0 flex-1 items-center"
                  role="search"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.08, duration: 0.16 }}
                    className="flex h-full min-w-0 flex-1 items-center rounded-l-full border border-r-0 border-zinc-300 pl-4 focus-within:border-[#1c62b9] dark:border-[#303030] dark:bg-[#121212]"
                  >
                    <input
                      ref={searchInputRef}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") closeMobileSearch();
                      }}
                      placeholder="Cari konten…"
                      aria-label="Cari konten"
                      className="w-full bg-transparent text-[16px] text-zinc-900 outline-none placeholder:text-zinc-500 dark:text-zinc-100"
                    />
                  </motion.div>
                  <motion.button
                    type="submit"
                    aria-label="Cari"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.08, duration: 0.16 }}
                    className="flex h-full w-14 shrink-0 items-center justify-center rounded-r-full border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-[#303030] dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/20"
                  >
                    <Search className="h-4 w-4 shrink-0" />
                  </motion.button>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>
        </MotionConfig>
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
