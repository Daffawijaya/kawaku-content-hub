import { cn } from "@/lib/utils";

export type UnderlineTabOption<T extends string> = {
  value: T;
  label: string;
};

export function UnderlineTabs<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: readonly UnderlineTabOption<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn("-mx-4 flex gap-4 overflow-x-auto border-b border-zinc-200 px-4 sm:mx-0 sm:gap-6 sm:px-0 dark:border-zinc-800", className)}
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "-mb-px min-h-[44px] shrink-0 whitespace-nowrap border-b-2 pb-2 pt-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-900 sm:min-h-0 sm:pt-0 dark:focus-visible:outline-white",
              active
                ? "border-zinc-900 font-medium text-zinc-900 dark:border-white dark:text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
