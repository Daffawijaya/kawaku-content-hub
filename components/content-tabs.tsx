import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";

export function ContentTabs({ active }: { active: "list" | "board" }) {
  return (
    <div className="ml-auto flex w-fit shrink-0 rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
      <Link
        href="/content"
        aria-label="Tampilan daftar"
        aria-current={active === "list" ? "page" : undefined}
        title="Daftar"
        className={cn(
          "rounded p-1.5",
          active === "list"
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "text-zinc-500"
        )}
      >
        <List className="h-4 w-4" />
      </Link>
      <Link
        href="/content/board"
        aria-label="Tampilan papan"
        aria-current={active === "board" ? "page" : undefined}
        title="Papan"
        className={cn(
          "rounded p-1.5",
          active === "board"
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "text-zinc-500"
        )}
      >
        <LayoutGrid className="h-4 w-4" />
      </Link>
    </div>
  );
}
