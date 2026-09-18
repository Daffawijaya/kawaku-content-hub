import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "ghost";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  default: "bg-brand-600 text-white hover:bg-brand-700",
  outline:
    "border border-zinc-200 bg-transparent hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800",
  ghost: "hover:bg-zinc-100 dark:hover:bg-zinc-800",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  icon: "h-9 w-9",
};

// Pill liquid-glass abu ala analytics + varian bg putih (Jadwalkan, Create).
// Tanpa shadow (flat).
export const pillGlass =
  "inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-b from-white/30 to-white/0 bg-zinc-900/[0.05] px-4 text-sm font-medium text-zinc-900 backdrop-blur-md hover:bg-zinc-900/10 disabled:opacity-50 dark:from-white/[0.07] dark:to-white/0 dark:bg-white/10 dark:text-white dark:hover:bg-white/20";
export const pillWhite =
  "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-full bg-white px-4 text-sm font-medium text-zinc-900 backdrop-blur-md hover:bg-zinc-100 disabled:opacity-50";

export function Button({
  variant = "default",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
