import * as React from "react";
import {
  CalendarDays,
  Check,
  Eye,
  Globe,
  Lightbulb,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentStatus, ContentType } from "@/lib/mock";
import { statusMeta, typeMeta } from "@/lib/mock";

const typeStyles: Record<ContentType, string> = {
  feed: "bg-amber-500 dark:bg-amber-500/20",
  carousel: "bg-green-500 dark:bg-green-500/20",
  reels: "bg-rose-500 dark:bg-rose-500/20",
};

const statusIcons: Record<ContentStatus, typeof CalendarDays> = {
  idea: Lightbulb,
  draft: Pencil,
  review: Eye,
  revision: RotateCcw,
  approved: Check,
  scheduled: CalendarDays,
  published: Globe,
};

export function StatusBadge({
  status,
  className,
}: {
  status: ContentStatus;
  className?: string;
}) {
  const Icon = statusIcons[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-xs font-medium text-white", className)}
    >
      <Icon className="h-3.5 w-3.5" />
      {statusMeta[status].label}
    </span>
  );
}

export function TypeBadge({ type, className }: { type: ContentType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium text-white",
        typeStyles[type],
        className
      )}
    >
      {typeMeta[type].label}
    </span>
  );
}

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
        className
      )}
      {...props}
    />
  );
}
