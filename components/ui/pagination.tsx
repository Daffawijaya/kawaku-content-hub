"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// Pagination bernomor ala halaman /content — dipakai semua tabel
// berhalaman (Daftar Konten, Top Content analytics).
export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number;
  pageCount: number;
  onChange: (p: number) => void;
}) {
  if (pageCount <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-center gap-1">
      <button
        aria-label="Halaman sebelumnya"
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        className="grid h-11 w-11 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 sm:h-auto sm:w-auto sm:p-1.5 dark:hover:bg-zinc-800"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          aria-label={`Halaman ${n}`}
          aria-current={n === page ? "page" : undefined}
          onClick={() => onChange(n)}
          className={cn(
            "min-h-[36px] min-w-[36px] rounded-md px-2 py-1 text-xs font-medium sm:min-h-0 sm:min-w-7",
            n === page
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          )}
        >
          {n}
        </button>
      ))}
      <button
        aria-label="Halaman berikutnya"
        disabled={page >= pageCount}
        onClick={() => onChange(Math.min(pageCount, page + 1))}
        className="grid h-11 w-11 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 disabled:opacity-40 sm:h-auto sm:w-auto sm:p-1.5 dark:hover:bg-zinc-800"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
