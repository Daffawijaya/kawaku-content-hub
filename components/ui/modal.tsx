"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

// Cangkang modal bersama (schedule, create): tinggi tetap, header fix.
// aside = kolom kanan fix (preview); footer = bar bawah fix;
// yang scroll hanya children.
export function ModalShell({
  label,
  title,
  subtitle,
  onClose,
  aside,
  footer,
  children,
}: {
  label: string;
  title: string;
  subtitle?: string;
  onClose?: () => void;
  aside?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40 backdrop-blur-md"
      />
      <div className="relative flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl dark:bg-[#212121]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4 sm:px-6 dark:border-zinc-600">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              aria-label="Tutup"
              onClick={onClose}
              className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
          <div className="flex shrink-0 items-center justify-end gap-2 px-4 py-3 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
