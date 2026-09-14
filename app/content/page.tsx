"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clapperboard,
  Eye,
  Images,
  LayoutGrid,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Smartphone,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ContentTabs } from "@/components/content-tabs";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  statusMeta,
  typeMeta,
  type ContentStatus,
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";
import { getAllContent } from "@/lib/content-store";
import { listContents, usesSupabase } from "@/lib/content-db";

const typeIcons: Record<ContentType, typeof LayoutGrid> = {
  feed: LayoutGrid,
  carousel: Images,
  reels: Clapperboard,
  story: Smartphone,
};

const typeOptions: ("all" | ContentType)[] = ["all", "feed", "carousel", "reels", "story"];
const statusOptions: ("all" | ContentStatus)[] = [
  "all",
  "idea",
  "scheduled",
  "published",
];

const pill = (active: boolean) =>
  active
    ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800";

function formatSchedule(date: string, time: string) {
  const d = new Date(`${date}T${time}:00`);
  if (Number.isNaN(d.getTime())) return `${date} • ${time}`;
  return (
    d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
    " • " +
    time
  );
}

export default function ContentPage() {
  return (
    <Suspense>
      <ContentList />
    </Suspense>
  );
}

function ContentList() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [type, setType] = useState<"all" | ContentType>("all");
  const [status, setStatus] = useState<"all" | ContentStatus>("all");
  const [date, setDate] = useState("");
  // Supabase bila dikonfigurasi, fallback mock/localStorage.
  const [items, setItems] = useState<ManagedContent[]>(() => getAllContent());
  const [loading, setLoading] = useState(usesSupabase());
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!usesSupabase()) return;
    listContents()
      .then(setItems)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Gagal memuat konten."))
      .finally(() => setLoading(false));
  }, []);
  const hasFilter = query !== "" || type !== "all" || status !== "all" || date !== "";

  const filtered = useMemo(
    () =>
      items.filter((item) => {
        if (type !== "all" && item.type !== type) return false;
        if (status !== "all" && item.status !== status) return false;
        if (date !== "" && item.scheduledDate !== date) return false;
        const q = query.trim().toLowerCase();
        if (q && !`${item.title} ${item.caption} ${item.pic}`.toLowerCase().includes(q))
          return false;
        return true;
      }),
    [query, type, status, date, items]
  );

  return (
    <div>
      <PageHeader
        title="Content"
        description="Kelola stok dan konten terjadwal KAWAKU."
        action={
          <Link href="/content/create">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Create Content
            </Button>
          </Link>
        }
      />

      <ContentTabs active="list" />
      <div className="mb-4 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 sm:w-64 dark:border-zinc-800 dark:bg-zinc-950">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, caption, PIC…"
              className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-zinc-900 outline-none dark:text-zinc-100"
            />
            {date && (
              <button aria-label="Clear date" onClick={() => setDate("")}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {hasFilter && (
            <button
              onClick={() => {
                setQuery("");
                setType("all");
                setStatus("all");
                setDate("");
              }}
              className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              Reset filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {typeOptions.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={pill(type === t)}
            >
              {t === "all" ? "All types" : typeMeta[t].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={pill(status === s)}
            >
              {s === "all" ? "All statuses" : statusMeta[s].label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <p className="border-b border-zinc-200 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800">
          {loading ? "Memuat konten…" : `${filtered.length} dari ${items.length} konten`}
          {usesSupabase() && !loading && (
            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              Supabase
            </span>
          )}
        </p>
        {loadError ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium">Gagal memuat dari Supabase</p>
            <p className="mt-1 text-xs text-zinc-500">{loadError}</p>
            <button
              onClick={() => {
                setLoadError(null);
                setLoading(true);
                listContents()
                  .then(setItems)
                  .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Gagal memuat konten."))
                  .finally(() => setLoading(false));
              }}
              className="mt-3 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              Coba lagi
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-2 px-5 py-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-md bg-zinc-100 dark:bg-zinc-800" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium">Tidak ada konten yang cocok</p>
            <p className="mt-1 text-xs text-zinc-500">
              Coba ubah kata kunci atau reset filter di atas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="px-5 py-3 font-medium">Content</th>
                  <th className="px-3 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Scheduled</th>
                  <th className="px-3 py-3 font-medium">PIC</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filtered.map((item) => {
                  const Icon = typeIcons[item.type];
                  return (
                    <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
                              item.tone
                            )}
                          >
                            <Icon className="h-4 w-4 text-zinc-500" />
                          </span>
                          <div className="min-w-0">
                            <p className="max-w-56 truncate font-medium">{item.title}</p>
                            <p className="max-w-56 truncate text-xs text-zinc-500">
                              {item.caption}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <TypeBadge type={item.type} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-zinc-500">
                        {formatSchedule(item.scheduledDate, item.scheduledTime)}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                            {item.initials}
                          </span>
                          <span className="whitespace-nowrap text-xs">{item.pic}</span>
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/content/${item.id}`}
                            aria-label={`View ${item.title}`}
                            title="View"
                            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/content/${item.id}/edit`}
                            aria-label={`Edit ${item.title}`}
                            title="Edit"
                            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            aria-label={`More actions for ${item.title}`}
                            title="More"
                            className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
