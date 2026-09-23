"use client";

import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { X } from "lucide-react";

// Cangkang modal bersama (schedule, create): tinggi tetap, header fix.
// aside = kolom kanan fix (preview); footer = bar bawah fix;
// yang scroll hanya children.
export function ModalShell({
  open,
  label,
  title,
  subtitle,
  onClose,
  aside,
  footer,
  children,
  onExitComplete,
  size = "lg",
}: {
  // Selalu render; buka-tutup (termasuk animasi keluar) diatur dari sini.
  open: boolean;
  label: string;
  // Opsional: tanpa judul = header hanya tombol tutup (mis. pratinjau story).
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  aside?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  onExitComplete?: () => void;
  // "sm" = dialog ramping secukupnya isi (konfirmasi); "lg" = form lebar.
  size?: "lg" | "sm";
}) {
  useEffect(() => {
    if (!open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence onExitComplete={onExitComplete}>
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          >
            <motion.button
              type="button"
              aria-label="Tutup"
              onClick={onClose}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={
                size === "sm"
                  ? "relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#212121]"
                  : "relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl dark:bg-[#212121]"
              }
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4 py-4 sm:px-6 dark:border-[#4c4c4c]">
                {title ? (
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{title}</h2>
                    {subtitle && (
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>
                    )}
                  </div>
                ) : (
                  <span />
                )}
                {onClose && (
                  <button
                    type="button"
                    aria-label="Tutup"
                    onClick={onClose}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 sm:h-auto sm:w-auto sm:p-1.5 dark:hover:bg-zinc-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
                {aside && (
                  <aside className="max-h-[38vh] shrink-0 overflow-y-auto px-4 py-4 sm:px-6 lg:order-2 lg:max-h-none lg:w-80">
                    {aside}
                  </aside>
                )}
                <div className="min-w-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:order-1">
                  {children}
                </div>
              </div>
              {footer && (
                <div className="flex flex-wrap shrink-0 items-center justify-end gap-2 p-4 sm:p-6">
                  {footer}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
