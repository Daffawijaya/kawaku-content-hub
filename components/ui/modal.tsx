"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

// Cangkang modal bersama (schedule, create): overlay + panel + header + Escape.
export function ModalShell({
  label,
  title,
  subtitle,
  onClose,
  children,
}: {
  label: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
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
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl sm:p-6 dark:bg-[#212121]">
        <div className="-mx-4 mb-4 flex items-start justify-between gap-3 border-b border-zinc-200 px-4 pb-4 sm:-mx-6 sm:px-6 dark:border-zinc-800">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
