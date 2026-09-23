"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { id } from "react-day-picker/locale";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

function parseIso(iso: string): Date | undefined {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formatLong(d: Date): string {
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

// Field tanggal ala input form: tombol → popup kalender.
// Tanggal sebelum hari ini auto-disabled. Nilai tetap YYYY-MM-DD lokal.
// Popup di-portal ke body (fixed) agar lolos dari overflow-hidden kartu modal.
const PANEL_W = 300;
const PANEL_H = 340;
export function DatePicker({
  id: inputId,
  value,
  onChange,
  error,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (iso: string) => void;
  error?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelElRef = useRef<HTMLDivElement | null>(null);
  const aboveRef = useRef(false);
  const selected = value ? parseIso(value) : undefined;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Posisi popup dari tombol: bawah kalau muat, else atas; jepit horizontal.
  // Pakai tinggi panel asli bila sudah ter-mount agar nempel tombol.
  const place = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const h = panelElRef.current?.offsetHeight ?? Math.min(PANEL_H, window.innerHeight - 16);
    const w = Math.min(PANEL_W, window.innerWidth - 16);
    const above = r.bottom + 8 + h > window.innerHeight;
    aboveRef.current = above;
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)),
      top: above ? Math.max(8, r.top - 8 - h) : r.bottom + 4,
    });
  }, []);

  // Koreksi dgn ukuran panel asli begitu ter-mount: jangkar persis ke tombol.
  const panelRef = useCallback((el: HTMLDivElement | null) => {
    panelElRef.current = el;
    if (!el) return;
    const btn = btnRef.current?.getBoundingClientRect();
    if (!btn) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - r.width - 8));
    const top = aboveRef.current
      ? Math.max(8, btn.top - 8 - r.height)
      : Math.min(btn.bottom + 4, Math.max(8, window.innerHeight - 8 - r.height));
    setPos((prev) => (prev && (prev.top !== top || prev.left !== left) ? { top, left } : prev));
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open ]);

  const def = getDefaultClassNames();

  return (
    <div>
      <button
        type="button"
        ref={btnRef}
        id={inputId}
        disabled={disabled}
        onClick={() => {
          if (!open) place();
          else setPos(null);
          setOpen((o) => !o);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex min-h-[44px] w-full items-center gap-2 rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-left text-sm text-zinc-900 outline-none focus:border-brand-500 sm:min-h-0 dark:border-[#4c4c4c] dark:text-zinc-100",
          !selected && "text-zinc-400",
          error && "border-rose-500 dark:border-rose-500"
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-zinc-400" />
        <span className="flex-1 truncate">{selected ? formatLong(selected) : "Pilih tanggal"}</span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Hapus tanggal"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }
            }}
            className="shrink-0 rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400" />
      </button>
      {open &&
        pos &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Tutup kalender"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] cursor-default bg-transparent"
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Pilih tanggal"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[70] max-w-[calc(100vw-1rem)] rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-[#4c4c4c] dark:bg-[#212121]"
            >
            <DayPicker
              mode="single"
              required
              locale={id}
              weekStartsOn={1}
              selected={selected}
              defaultMonth={selected ?? today}
              disabled={{ before: today }}
              onSelect={(d) => {
                if (d) {
                  onChange(toIso(d));
                  setOpen(false);
                }
              }}
              classNames={{
                root: `${def.root} relative text-sm`,
                months: "flex",
                month: "space-y-2",
                month_caption: "flex items-center justify-center px-8 py-1 text-sm font-semibold",
                nav: "absolute inset-x-1 top-1 flex items-center justify-between",
                button_previous:
                  "grid h-7 w-7 place-items-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800",
                button_next:
                  "grid h-7 w-7 place-items-center rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800",
                chevron: `${def.chevron} fill-zinc-500`,
                month_grid: "w-full border-collapse",
                weekday: "w-9 pb-1 text-center text-xs font-normal text-zinc-400",
                day: "p-0 text-center",
                day_button:
                  "mx-auto grid h-9 w-9 place-items-center rounded-full text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
                selected: "bg-zinc-900 text-white hover:bg-zinc-900 dark:bg-white dark:text-zinc-900 dark:hover:bg-white",
                today: "font-semibold underline decoration-brand-500 decoration-2 underline-offset-4",
                outside: "text-zinc-300 dark:text-zinc-700",
                hidden: "hidden",
                disabled:
                  "cursor-not-allowed text-zinc-300 opacity-70 hover:bg-transparent dark:text-zinc-700 dark:hover:bg-transparent",
              }}
            />
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
