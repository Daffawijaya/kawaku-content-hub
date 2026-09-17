import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string | number> = {
  value: T;
  label: string;
  icon?: ReactNode;
};

// Pilihan tersegmentasi konsisten (filter analytics, type picker form, dsb).
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "flex w-fit rounded-md border border-zinc-200 p-0.5 dark:border-zinc-600",
        className
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "flex items-center justify-center gap-1.5 rounded px-3 py-1 text-xs font-medium",
            value === o.value
              ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}
