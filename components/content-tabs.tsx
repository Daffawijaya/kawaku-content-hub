import Link from "next/link";
import { KanbanSquare, TableProperties } from "lucide-react";
import { cn } from "@/lib/utils";

export function ContentTabs({ active }: { active: "list" | "board" }) {
  return (
    <div className="mb-4 flex w-fit rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
      <Link
        href="/content"
        aria-current={active === "list" ? "page" : undefined}
        className={cn(
          "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium",
          active === "list"
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        )}
      >
        <TableProperties className="h-3.5 w-3.5" /> List
      </Link>
      <Link
        href="/content/board"
        aria-current={active === "board" ? "page" : undefined}
        className={cn(
          "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium",
          active === "board"
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        )}
      >
        <KanbanSquare className="h-3.5 w-3.5" /> Board
      </Link>
    </div>
  );
}
