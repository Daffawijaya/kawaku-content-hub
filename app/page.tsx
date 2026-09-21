"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, ChevronDown, Copy, Menu, X } from "lucide-react";

// Design Read: landing satu layar untuk kreator UMKM Kutai Kartanegara,
// berbahasa hero sinematik terpusat mengikuti referensi,
// dial ENERGY 2 / RHYTHM 1 / MOTION 1.
const NAV_ITEMS = [
  { label: "Rules", dropdown: true },
  { label: "Skills", dropdown: true },
  { label: "Agents", dropdown: true },
  { label: "Docs", dropdown: true },
  { label: "Roadmap", dropdown: false },
];

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/90";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  // TODO: ganti dialog "segera hadir" dengan rute asli saat halaman Rules dkk tersedia.
  // Dialog adalah perilaku nyata agar tidak ada kontrol mati (label terlihat di judul dialog).
  const [pending, setPending] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPending(null);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!copied && !copyFailed) return;
    const t = setTimeout(() => {
      setCopied(false);
      setCopyFailed(false);
    }, 2000);
    return () => clearTimeout(t);
  }, [copied, copyFailed]);

  const copyDashboardLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/dashboard`);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }, []);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0b0b10] text-white">
      {/* Scrim hitam/60 di atas ilustrasi: satu-satunya gradasi di halaman,
          tujuannya keterbacaan. Rasio kontras teks putih terburuk terukur 5,74:1. */}
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src="/kawaku-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      </div>

      <header className="relative z-20">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 md:h-20 md:px-10">
          <Link
            href="/"
            aria-label="kawaku home"
            className={`flex min-h-[44px] items-center text-[22px] font-bold tracking-tight text-white ${FOCUS}`}
          >
            /kawaku
          </Link>

          <nav aria-label="Primer" className="hidden items-center gap-8 lg:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setPending(item.label)}
                className={`flex min-h-[44px] items-center gap-1 text-[15px] font-medium text-white/90 transition-colors hover:text-white ${FOCUS}`}
              >
                {item.label}
                {item.dropdown && (
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
                )}
              </button>
            ))}
          </nav>

          <div className="hidden items-center gap-6 lg:flex">
            <button
              type="button"
              onClick={() => setPending("GitHub")}
              className={`min-h-[44px] text-[15px] font-medium text-white/90 transition-colors hover:text-white ${FOCUS}`}
            >
              GitHub
            </button>
            <Link
              href="/dashboard"
              className={`inline-flex min-h-[44px] items-center rounded-full border border-white/30 bg-white/10 px-5 py-2 text-[15px] font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/20 ${FOCUS}`}
            >
              buka dashboard
            </Link>
          </div>

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            onClick={() => setMenuOpen((v) => !v)}
            className={`grid h-11 w-11 place-items-center rounded-full border border-white/30 text-white lg:hidden ${FOCUS}`}
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        {menuOpen && (
          <nav
            aria-label="Seluler"
            className="mx-6 rounded-2xl border border-white/15 bg-black/70 p-3 backdrop-blur-xl md:mx-10 lg:hidden"
          >
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setPending(item.label);
                }}
                className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-4 text-[15px] font-medium text-white/90 hover:bg-white/10 ${FOCUS}`}
              >
                {item.label}
                {item.dropdown && (
                  <ChevronDown className="h-4 w-4 opacity-70" aria-hidden="true" />
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setPending("GitHub");
              }}
              className={`mt-1 min-h-[44px] w-full rounded-xl px-4 text-left text-[15px] font-medium text-white/90 hover:bg-white/10 ${FOCUS}`}
            >
              GitHub
            </button>
            <Link
              href="/dashboard"
              className={`mt-2 flex min-h-[44px] items-center justify-center rounded-full border border-white/30 bg-white/10 px-4 text-[15px] font-semibold text-white ${FOCUS}`}
            >
              buka dashboard
            </Link>
          </nav>
        )}
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col items-center justify-center px-6 pb-16 pt-10 text-center md:px-10">
        <h1 className="max-w-4xl text-balance text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[1.05] tracking-[-0.02em] text-white">
          Karya Wirausaha dan Ekonomi Kreatif Kutai Kartanegara
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-[clamp(1rem,1.8vw,1.25rem)] leading-relaxed text-white/85">
          Filter untuk kreator kawaku di kalender, konten, dan media. Edukasi,
          inspirasi, dan info seputar UMKM, tanpa yang generik.
        </p>

        <div className="mt-8 flex w-full max-w-[540px] items-center gap-2 rounded-full border border-white/25 bg-white/10 py-2 pl-6 pr-2 backdrop-blur-md">
          <Link
            href="/dashboard"
            aria-label="Buka dashboard kawaku"
            className={`min-w-0 flex-1 truncate text-left font-mono text-[15px] text-white/95 ${FOCUS}`}
          >
            kawaku/dashboard
          </Link>
          <button
            type="button"
            onClick={copyDashboardLink}
            aria-label="Salin tautan dashboard"
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/25 bg-white/10 text-white transition-colors hover:bg-white/20 ${FOCUS}`}
          >
            {copied ? (
              <Check className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Copy className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
        <p aria-live="polite" className="mt-3 h-5 text-sm text-white/75">
          {copied
            ? "Tautan dashboard disalin."
            : copyFailed
              ? "Gagal menyalin. Salin manual dari address bar."
              : ""}
        </p>
      </main>

      <footer className="relative z-10 px-6 pb-6 text-center md:px-10">
        <p className="mx-auto max-w-3xl text-[13px] leading-relaxed text-white/70">
          kawaku adalah hub, bukan sulap. Ia merapikan kalender, konten, dan
          media tim agar kerja UMKM tercatat dan terbit tepat waktu.
        </p>
      </footer>

      {pending && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={() => setPending(null)}
            className="absolute inset-0 cursor-default bg-black/60"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="coming-title"
            className="relative w-full max-w-sm rounded-2xl border border-white/15 bg-[#141419] p-6 text-left shadow-2xl"
          >
            <h2 id="coming-title" className="text-lg font-bold text-white">
              {pending} segera hadir
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Bagian ini belum tersedia di kawaku. Yang sudah jadi dan bisa
              dibuka sekarang adalah dashboard.
            </p>
            <div className="mt-5 flex gap-3">
              <Link
                href="/dashboard"
                className={`flex h-11 flex-1 items-center justify-center rounded-full bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-white/85 ${FOCUS}`}
              >
                buka dashboard
              </Link>
              <button
                type="button"
                autoFocus
                onClick={() => setPending(null)}
                className={`h-11 rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10 ${FOCUS}`}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
