import Link from "next/link";
import { cn } from "@/lib/utils";

export function ContentTabs({ active }: { active: "list" | "board" }) {
  return (
    <div className="mb-4 flex w-fit rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
      <Link
        href="/content"
        aria-current={active === "list" ? "page" : undefined}
        className={cn(
          "rounded px-3 py-1 text-xs font-medium",
          active === "list"
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        )}
      >
        Daftar
      </Link>
      <Link
        href="/content/board"
        aria-current={active === "board" ? "page" : undefined}
        className={cn(
          "rounded px-3 py-1 text-xs font-medium",
          active === "board"
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        )}
      >
        Papan
      </Link>
    </div>
  );
}
