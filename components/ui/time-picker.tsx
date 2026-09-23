"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Popup jam ala DatePicker: portal ke body (fixed) agar lolos
// dari overflow-hidden kartu modal. Nilai tetap HH:MM.
const PANEL_W = 220;
const PANEL_H = 240;

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// Jam cutoff = 1 jam dari sekarang (utk posisi awal kolom).
function cutoffHour(): string {
  return String(new Date(Date.now() + 60 * 60 * 1000).getHours()).padStart(2, "0");
}

function parseTime(v: string): { h: string; m: string } {
  const [h = "", m = ""] = v.split(":");
  return {
    h: /^\d{2}$/.test(h) && Number(h) < 24 ? h : "",
    m: /^\d{2}$/.test(m) && Number(m) < 60 ? m : "",
  };
}

export function TimePicker({
  id: inputId,
  value,
  onChange,
  error,
  disabled,
  min,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  disabled?: boolean;
  // Batas bawah HH:MM (mis. jam sekarang saat tanggal = hari ini).
  min?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelElRef = useRef<HTMLDivElement | null>(null);
  const aboveRef = useRef(false);
  // Pilihan sesi ini (reset tiap buka) — melengkapi nilai yg sudah ada.
  const [pickH, setPickH] = useState<string | null>(null);
  const [pickM, setPickM] = useState<string | null>(null);

  const cur = parseTime(value);
  const selH = pickH ?? cur.h;
  const selM = pickM ?? cur.m;
  const { h: minH, m: minM } = parseTime(min ?? "");
  const hourOff = (h: string) => !!minH && h < minH;
  const minOff = (m: string) => !!minH && !!minM && selH === minH && m <= minM;
  // Kolom jam mulai tampil dari 1 jam setelah sekarang (min. 09).
  const cutH = cutoffHour();
  const initH = cutH > "09" ? cutH : "09";
  const didInitScroll = useRef(false);

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
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place ]);

  function toggle() {
    if (!open) {
      setPickH(null);
      setPickM(null);
      didInitScroll.current = false;
      place();
    } else {
      setPos(null);
    }
    setOpen((o) => !o);
  }

  function close() {
    setPos(null);
    setOpen(false);
  }

  function chooseH(h: string) {
    const m = pickM ?? cur.m;
    setPickH(h);
    if (m) {
      onChange(`${h}:${m}`);
      close();
    }
  }

  function chooseM(m: string) {
    const h = pickH ?? cur.h;
    setPickM(m);
    if (h) {
      onChange(`${h}:${m}`);
      close();
    }
  }

  function colItem(v: string, selected: boolean, off: boolean, onPick: () => void, scrollTarget: string | null) {
    return (
      <button
        key={v}
        type="button"
        disabled={off}
        onClick={onPick}
        ref={(el) => {
          if (!el) return;
          if (selected) el.scrollIntoView({ block: "center" });
          else if (scrollTarget === v && !didInitScroll.current) {
            didInitScroll.current = true;
            el.scrollIntoView({ block: "center" });
          }
        }}
        className={cn(
          "w-full rounded-md px-2 py-1.5 text-center text-sm tabular-nums",
          off
            ? "cursor-not-allowed text-zinc-300 opacity-70 dark:text-zinc-700"
            : selected
              ? "bg-zinc-900 font-medium text-white dark:bg-white dark:text-zinc-900"
              : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        )}
      >
        {v}
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        ref={btnRef}
        id={inputId}
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          "flex min-h-[44px] w-full items-center gap-2 rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-left text-sm text-zinc-900 tabular-nums outline-none focus:border-brand-500 sm:min-h-0 dark:border-[#4c4c4c] dark:text-zinc-100",
          !value && "text-zinc-400",
          error && "border-rose-500 dark:border-rose-500"
        )}
      >
        <Clock className="h-4 w-4 shrink-0 text-zinc-400" />
        <span className="flex-1 truncate">{value || "Pilih jam"}</span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Hapus jam"
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
              aria-label="Tutup pemilih jam"
              onClick={close}
              className="fixed inset-0 z-[60] cursor-default bg-transparent"
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Pilih jam"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[70] max-w-[calc(100vw-1rem)] rounded-xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-[#4c4c4c] dark:bg-[#212121]"
            >
              <div className="flex gap-1">
                <div className="w-20">
                  <p className="pb-1 text-center text-xs font-medium text-zinc-400">Jam</p>
                  <div className="h-44 space-y-0.5 overflow-y-auto overscroll-contain">
                    {HOURS.map((h) => colItem(h, h === selH, hourOff(h), () => chooseH(h), selH ? null : initH))}
                  </div>
                </div>
                <div className="w-20">
                  <p className="pb-1 text-center text-xs font-medium text-zinc-400">Menit</p>
                  <div className="h-44 space-y-0.5 overflow-y-auto overscroll-contain">
                    {MINUTES.map((m) => colItem(m, m === selM, minOff(m), () => chooseM(m), null))}
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
