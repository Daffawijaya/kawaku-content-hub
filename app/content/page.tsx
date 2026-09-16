"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clapperboard,
  EllipsisVertical,
  ExternalLink,
  Eye,
  Images,
  LayoutGrid,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ContentTabs } from "@/components/content-tabs";
import { TopContentTable } from "@/components/top-content-table";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  statusMeta,
  typeMeta,
  type ContentStatus,
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";
import { deleteContent, listContents } from "@/lib/content-db";

const typeIcons: Record<ContentType, typeof LayoutGrid> = {
  feed: LayoutGrid,
  carousel: Images,
  reels: Clapperboard,
};

const typeOptions: ("all" | ContentType)[] = ["all", "feed", "carousel", "reels"];
const statusOptions: ("all" | ContentStatus)[] = [
  "all",
  "idea",
  "scheduled",
  "published",
];

const pill = (active: boolean) =>
  active
    ? "rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

// Template grid kolom tabel /content — dipakai header + semua baris
// supaya tiap kolom sejajar. Urutan sel: konten, label, jadwal, PIC, aksi.
// Kolom yg hidden di breakpoint kecil tidak mengisi sel grid.
const rowGrid =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:grid-cols-[minmax(0,1fr)_128px_40px] md:grid-cols-[minmax(0,1fr)_176px_128px_40px] lg:grid-cols-[minmax(0,1fr)_176px_160px_128px_40px]";

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
  // Seluruh isi dari Supabase — tanpa fallback dummy.
  const [items, setItems] = useState<ManagedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    listContents()
      .then(setItems)
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Gagal memuat konten."))
      .finally(() => setLoading(false));
  }, []);

  async function removeContent(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    setConfirmDeleteId(null);
    try {
      await deleteContent(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Hapus gagal.");
    }
  }
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
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
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
        <div className="flex flex-wrap items-center gap-1.5">
          {typeOptions.map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={pill(type === t)}
            >
              {t === "all" ? "All types" : typeMeta[t].label}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />
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

      <TopContentTable
        items={filtered.map((c) => ({ c }))}
        loading={loading}
        insightsLoading={false}
        previews={{}}
        sort="newest"
        title="Daftar Konten"
        sortable={false}
        subtitle={loading ? "Memuat konten…" : `${filtered.length} dari ${items.length} konten`}
        expandable={false}
        emptyText={
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium">Tidak ada konten yang cocok</p>
            <p className="mt-1 text-xs text-zinc-500">
              Coba ubah kata kunci atau reset filter di atas.
            </p>
          </div>
        }
        error={
          loadError ? (
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
          ) : null
        }
        renderRow={({ c: item }) => {
          const Icon = typeIcons[item.type];
          return (
            <div
              className={cn(
                rowGrid,
                "border-b border-zinc-100 py-2.5 last:border-0 hover:bg-white/70 dark:border-zinc-800/60 dark:hover:bg-zinc-800/60"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br",
                    item.tone
                  )}
                >
                  <Icon className="h-4 w-4 text-zinc-500" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {item.caption}
                  </p>
                </div>
              </div>
              <div className="hidden min-w-0 md:flex md:flex-wrap md:gap-1">
                <TypeBadge type={item.type} />
                <StatusBadge status={item.status} />
              </div>
              <span className="hidden min-w-0 truncate text-xs text-zinc-500 lg:block">
                {formatSchedule(item.scheduledDate, item.scheduledTime)}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {item.initials}
                  </span>
                  <span className="truncate text-xs">{item.pic}</span>
                </span>
              </span>
              <div className="flex items-center justify-end">
                <Dropdown
                  width="w-48"
                  trigger={(open) => (
                    <button
                      aria-label={`Aksi untuk ${item.title}`}
                      aria-expanded={open}
                      title="Aksi"
                      className={cn(
                        "rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
                        confirmDeleteId === item.id &&
                          "bg-rose-600 text-white hover:bg-rose-700 hover:text-white"
                      )}
                    >
                      <EllipsisVertical className="h-4 w-4" />
                    </button>
                  )}
                >
                  <DropdownItem icon={<Eye className="h-3.5 w-3.5" />} href={`/content/${item.id}`}>
                    Detail
                  </DropdownItem>
                  <DropdownItem icon={<Pencil className="h-3.5 w-3.5" />} href={`/content/${item.id}/edit`}>
                    Edit
                  </DropdownItem>
                  {item.publishedUrl && (
                    <DropdownItem icon={<ExternalLink className="h-3.5 w-3.5" />} href={item.publishedUrl} external>
                      Lihat di Instagram
                    </DropdownItem>
                  )}
                  <DropdownItem
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    danger
                    onClick={() => void removeContent(item.id)}
                  >
                    {confirmDeleteId === item.id ? "Ya, hapus konten ini" : "Hapus"}
                  </DropdownItem>
                </Dropdown>
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}
