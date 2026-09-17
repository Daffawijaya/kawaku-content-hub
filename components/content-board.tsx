"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clapperboard,
  Images,
  LayoutGrid,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { TypeBadge, typeStyles } from "@/components/ui/badge";
import { ScheduleModal } from "@/components/schedule-modal";
import { cn } from "@/lib/utils";
import { formatDateFull } from "@/lib/format";
import {
  LEGACY_STATUS,
  statusFlow,
  statusMeta,
  statusTransitions,
  typeMeta,
  type ContentStatus,
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";
import { changeStatus, listContentsAll, type ContentThumb } from "@/lib/content-db";
import { listTeamNames } from "@/lib/team-db";
import { thumbUrl } from "@/lib/drive/thumb";
import type { IgPreview } from "@/lib/instagram/client";

const typeIcons: Record<ContentType, typeof LayoutGrid> = {
  feed: LayoutGrid,
  carousel: Images,
  reels: Clapperboard,
};

const pill = (active: boolean) =>
  active
    ? "rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

export function ContentBoard() {
  const [items, setItems] = useState<ManagedContent[]>([]);
  const [query, setQuery] = useState("");
  const [selTypes, setSelTypes] = useState<ContentType[]>([]);
  const [selPics, setSelPics] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<ContentStatus | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [picOptions, setPicOptions] = useState<string[]>([]);
  const [scheduleTarget, setScheduleTarget] = useState<ManagedContent | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, ContentThumb>>({});
  const [previews, setPreviews] = useState<Record<string, IgPreview>>({});
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function reload() {
    try {
      const r = await listContentsAll();
      setItems(r.items);
      setThumbs(r.thumbs);
      setPreviews(r.previews);
    } catch {
      setItems([]);
      showToast("Gagal memuat konten.", false);
    } finally {
      setLoading(false);
    }
  }

  // Status tak dikenal (data korup/lama) dinormalisasi ke Stok agar tidak hilang.
  const visibleItems = useMemo(
    () => items.map((c) => (LEGACY_STATUS[c.status] ? { ...c, status: LEGACY_STATUS[c.status] } : c)),
    [items]
  );

  useEffect(() => {
    void reload();
    listTeamNames().then((names) => {
      if (names.length > 0) setPicOptions(names);
    });
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
      visibleItems.filter((c) => {
        if (selTypes.length > 0 && !selTypes.includes(c.type)) return false;
        if (selPics.length > 0 && !selPics.some((p) => c.pic.split(",").map((s) => s.trim()).includes(p))) return false;
        const q = query.trim().toLowerCase();
        if (q && !`${c.title} ${c.caption} ${c.pic}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [visibleItems, query, selTypes, selPics]
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
    // Stok → Scheduled: lengkapi dulu via modal (stok sering belum lengkap).
    if (card.status === "idea" && to === "scheduled") {
      setScheduleTarget(card);
      setScheduleOpen(true);
      return;
    }
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
    query !== "" || selTypes.length + selPics.length > 0;

  // Scroll mouse vertikal di atas baris → geser kanan-kiri saja,
  // halaman tidak ikut kegeser. Native listener non-pasif karena
  // onWheel React pasif (preventDefault-nya diabaikan browser).
  // Kalau isi baris muat semua, scroll halaman dibiarkan normal.
  function bindWheelRow(el: HTMLDivElement | null) {
    if (!el || el.dataset.wheelBound) return;
    el.dataset.wheelBound = "1";
    el.addEventListener(
      "wheel",
      (e) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        if (el.scrollWidth <= el.clientWidth + 1) return;
        e.preventDefault();
        el.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      },
      { passive: false }
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
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
        <span className="mx-1 hidden h-4 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />
        {(Object.keys(typeMeta) as ContentType[]).map((t) => (
          <button key={t} onClick={() => toggle(selTypes, t, setSelTypes)} className={pill(selTypes.includes(t))}>
            {typeMeta[t].label}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />
        {picOptions.map((n) => (
          <button key={n} onClick={() => toggle(selPics, n, setSelPics)} className={pill(selPics.includes(n))}>
            {n.split(" ")[0]}
          </button>
        ))}
        {hasFilter && (
          <button
            onClick={() => {
              setQuery("");
              setSelTypes([]);
              setSelPics([]);
            }}
            className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Columns */}
      {loading ? (
        <div className="space-y-3 pb-4">
          {statusFlow.map((s) => (
            <div key={s} className="space-y-2">
              <div className="h-5 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="flex gap-2 overflow-hidden">
                <div className="h-32 w-64 shrink-0 animate-pulse rounded-lg bg-zinc-100 sm:w-72 dark:bg-zinc-800" />
                <div className="h-32 w-64 shrink-0 animate-pulse rounded-lg bg-zinc-100 sm:w-72 dark:bg-zinc-800" />
                <div className="hidden h-32 w-64 shrink-0 animate-pulse rounded-lg bg-zinc-100 sm:block sm:w-72 dark:bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : (
      <div className="space-y-3 pb-4">
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
                "overflow-hidden rounded-xl border",
                active
                  ? "border-brand-500"
                  : "border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40"
              )}
            >
              <header className="flex items-center justify-between bg-zinc-100/80 px-3 py-2 dark:bg-[#212121]">
                <h3 className="text-sm font-semibold">{statusMeta[status].label}</h3>
                <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {cards.length}
                </span>
              </header>
              <div ref={bindWheelRow} className="flex gap-2 overflow-x-auto overscroll-x-contain p-2">
                {cards.length === 0 && (
                  <div className="w-full shrink-0 rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-400 sm:w-72 dark:border-zinc-700">
                    Tidak ada konten
                  </div>
                )}
                {cards.map((c) => {
                  const Icon = typeIcons[c.type];
                  const picNames = c.pic.split(",").map((s) => s.trim()).filter(Boolean);
                  const picInits = c.initials.split(",").map((s) => s.trim());
                  const pv = c.igMediaId ? previews[c.igMediaId] : undefined;
                  const igUrl = pv?.mediaUrl || pv?.thumbUrl;
                  const igIsVideo = (pv?.mediaType === "VIDEO" || pv?.mediaType === "REELS") && !!pv?.mediaUrl;
                  const th = thumbs[c.id];
                  const hideBroken = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
                    e.currentTarget.style.display = "none";
                  };
                  return (
                    <Link
                      key={c.id}
                      href={`/content/${c.id}`}
                      // Published terkunci (arsip) — konsisten dgn calendar.
                      draggable={c.status !== "published"}
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
                        "block w-64 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white hover:border-zinc-300 sm:w-72 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700",
                        dragId === c.id && "opacity-50",
                        c.status === "published" ? "cursor-default" : "cursor-grab"
                      )}
                    >
                      <span className={cn("relative flex h-16 items-center justify-center overflow-hidden", typeStyles[c.type])}>
                        <Icon className="h-5 w-5 text-white" />
                        {igUrl ? (
                          igIsVideo ? (
                            <video
                              src={pv?.mediaUrl}
                              poster={pv?.thumbUrl}
                              muted
                              playsInline
                              preload="metadata"
                              className="absolute inset-0 h-full w-full bg-black object-cover"
                              onError={hideBroken}
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={igUrl}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover"
                              onError={hideBroken}
                            />
                          )
                        ) : th?.driveFileId ? (
                          th.kind === "video" ? (
                            <video
                              src={thumbUrl(th.driveFileId)}
                              muted
                              playsInline
                              preload="metadata"
                              className="absolute inset-0 h-full w-full bg-black object-cover"
                              onError={hideBroken}
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={thumbUrl(th.driveFileId)}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 h-full w-full object-cover"
                              onError={hideBroken}
                            />
                          )
                        ) : null}
                      </span>
                      <span className="block space-y-1.5 p-2.5">
                        <span className="block truncate text-sm font-medium">{c.title}</span>
                        <span className="block text-[11px] text-zinc-500">
                          {c.scheduledDate ? formatDateFull(c.scheduledDate) : "Belum dijadwalkan"}
                        </span>
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center -space-x-1.5" title={c.pic}>
                            {picNames.map((n, i) => (
                              <span
                                key={`${n}-${i}`}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[9px] font-semibold text-brand-700 ring-2 ring-white dark:bg-brand-950 dark:text-brand-300 dark:ring-zinc-950"
                              >
                                {picInits[i] || n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                              </span>
                            ))}
                          </span>
                          <TypeBadge type={c.type} className="shrink-0 px-1.5 py-0 text-[10px]" />
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

      {/* Modal lengkapi-lalu-jadwalkan (drop stok → scheduled) */}
      <ScheduleModal
        open={scheduleOpen}
        content={scheduleTarget}
        onClose={() => setScheduleOpen(false)}
        onScheduled={(title) => {
          setScheduleOpen(false);
          void reload();
          showToast(`“${title}” → ${statusMeta.scheduled.label}`, true);
        }}
        onExitComplete={() => setScheduleTarget(null)}
      />
    </div>
  );
}
