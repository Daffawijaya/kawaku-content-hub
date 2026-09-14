"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clapperboard,
  Images,
  LayoutGrid,
  Search,
  Smartphone,
  TriangleAlert,
  X,
} from "lucide-react";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  categories,
  contentLibrary,
  statusFlow,
  statusMeta,
  statusTransitions,
  teamNames,
  typeMeta,
  type ContentStatus,
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";
import { changeStatus, listContents, usesSupabase } from "@/lib/content-db";
import { getAllContent } from "@/lib/content-store";

const typeIcons: Record<ContentType, typeof LayoutGrid> = {
  feed: LayoutGrid,
  carousel: Images,
  reels: Clapperboard,
  story: Smartphone,
};

const pill = (active: boolean) =>
  active
    ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800";

function fmtShort(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const s = new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
  return `${s} • ${time}`;
}

export function ContentBoard() {
  const [items, setItems] = useState<ManagedContent[]>(contentLibrary);
  const [query, setQuery] = useState("");
  const [selTypes, setSelTypes] = useState<ContentType[]>([]);
  const [selCats, setSelCats] = useState<string[]>([]);
  const [selPics, setSelPics] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<ContentStatus | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(usesSupabase());
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function reload() {
    try {
      setItems(await listContents());
    } catch {
      setItems(getAllContent());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!usesSupabase()) {
      setItems(getAllContent());
    } else {
      void reload();
    }
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  const filtered = useMemo(
    () =>
      items.filter((c) => {
        if (selTypes.length > 0 && !selTypes.includes(c.type)) return false;
        if (selCats.length > 0 && !selCats.includes(c.category)) return false;
        if (selPics.length > 0 && !selPics.includes(c.pic)) return false;
        const q = query.trim().toLowerCase();
        if (q && !`${c.title} ${c.caption} ${c.pic}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [items, query, selTypes, selCats, selPics]
  );

  const byStatus = useMemo(() => {
    const m = new Map<ContentStatus, ManagedContent[]>();
    for (const s of statusFlow) m.set(s, []);
    for (const c of filtered) m.get(c.status)?.push(c);
    return m;
  }, [filtered]);

  function toggle<T>(list: T[], v: T, set: (x: T[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function onDropCol(e: React.DragEvent, to: ContentStatus) {
    e.preventDefault();
    setDropCol(null);
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    if (!id) return;
    const card = items.find((c) => c.id === id);
    if (!card || card.status === to) return;
    if (!statusTransitions[card.status].includes(to)) {
      showToast(`Tidak bisa pindah ${statusMeta[card.status].label} → ${statusMeta[to].label}`, false);
      return;
    }
    try {
      await changeStatus(id, to);
      await reload();
      showToast(`“${card.title}” → ${statusMeta[to].label}`, true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengubah status.", false);
    }
  }

  const hasFilter =
    query !== "" || selTypes.length + selCats.length + selPics.length > 0;

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 space-y-2">
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
          {hasFilter && (
            <button
              onClick={() => {
                setQuery("");
                setSelTypes([]);
                setSelCats([]);
                setSelPics([]);
              }}
              className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
            >
              Reset filter
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(typeMeta) as ContentType[]).map((t) => (
            <button key={t} onClick={() => toggle(selTypes, t, setSelTypes)} className={pill(selTypes.includes(t))}>
              {typeMeta[t].label}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px self-center bg-zinc-200 sm:block dark:bg-zinc-800" />
          {categories.map((c) => (
            <button key={c} onClick={() => toggle(selCats, c, setSelCats)} className={pill(selCats.includes(c))}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {teamNames.map((n) => (
            <button key={n} onClick={() => toggle(selPics, n, setSelPics)} className={pill(selPics.includes(n))}>
              {n.split(" ")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Columns */}
      {loading ? (
        <div className="flex items-start gap-3 overflow-x-auto pb-4">
          {statusFlow.map((s) => (
            <div key={s} className="w-64 shrink-0 space-y-2 sm:w-72">
              <div className="h-5 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : (
      <div className="flex items-start gap-3 overflow-x-auto pb-4">
        {statusFlow.map((status) => {
          const cards = byStatus.get(status) ?? [];
          const active = dropCol === status;
          return (
            <section
              key={status}
              aria-label={statusMeta[status].label}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setDropCol(status);
              }}
              onDragLeave={() => setDropCol((d) => (d === status ? null : d))}
              onDrop={(e) => onDropCol(e, status)}
              className={cn(
                "w-64 shrink-0 rounded-xl border bg-zinc-50/60 p-2 sm:w-72 dark:bg-zinc-900/40",
                active
                  ? "border-emerald-500"
                  : "border-zinc-200 dark:border-zinc-800"
              )}
            >
              <header className="flex items-center justify-between px-1.5 py-1.5">
                <h3 className="text-xs font-semibold">{statusMeta[status].label}</h3>
                <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {cards.length}
                </span>
              </header>
              <div className="max-h-[68vh] space-y-2 overflow-y-auto p-0.5">
                {cards.length === 0 && (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700">
                    Tidak ada konten
                  </div>
                )}
                {cards.map((c) => {
                  const Icon = typeIcons[c.type];
                  return (
                    <Link
                      key={c.id}
                      href={`/content/${c.id}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDragId(c.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropCol(null);
                      }}
                      className={cn(
                        "block overflow-hidden rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
                        dragId === c.id && "opacity-50"
                      )}
                    >
                      <span className={cn("flex h-16 items-center justify-center bg-gradient-to-br", c.tone)}>
                        <Icon className="h-5 w-5 text-zinc-400" />
                      </span>
                      <span className="block space-y-1.5 p-2.5">
                        <span className="block truncate text-sm font-medium">{c.title}</span>
                        <span className="flex flex-wrap gap-1">
                          <TypeBadge type={c.type} className="px-1.5 py-0 text-[10px]" />
                          <StatusBadge status={c.status} className="px-1.5 py-0 text-[10px]" />
                        </span>
                        <span className="block text-[11px] text-zinc-500">
                          {fmtShort(c.scheduledDate, c.scheduledTime)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {c.initials}
                          </span>
                          <span className="truncate text-[11px] text-zinc-500">{c.pic}</span>
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
      )}

      {/* Toast */}
      {toast && (
        <p
          role="status"
          className={cn(
            "fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg",
            toast.ok ? "bg-zinc-900 dark:bg-white dark:text-zinc-900" : "bg-rose-600"
          )}
        >
          {toast.ok ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
          {toast.msg}
        </p>
      )}
    </div>
  );
}
