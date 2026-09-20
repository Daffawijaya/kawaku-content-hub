"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clapperboard,
  Images,
  LayoutGrid,
  Loader2,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { TypeBadge } from "@/components/ui/badge";
import { AvatarPhoto } from "@/components/ui/avatar";
import { ContentTabs } from "@/components/content-tabs";
import { ScheduleModal } from "@/components/schedule-modal";
import { cn } from "@/lib/utils";
import { useAvatarMap } from "@/lib/profile-avatar";
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
import { changeStatus, listContentsPage, type ContentThumb } from "@/lib/content-db";
import { listTeamNames } from "@/lib/team-db";
import { posterUrl } from "@/lib/drive/thumb";
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

// Board: tiap kolom fetch sendiri 5 per halaman (awal 5, +5 tiap scroll
// mentok) agar payload kecil. Filter type/PIC/search dikirim ke BE.
const PAGE_SIZE = 5;

// Status legacy yg ikut dihitung di tiap kolom board.
const colStatuses: Record<string, string[]> = {
  draft: ["draft"],
  idea: ["idea", "review", "revision"],
  scheduled: ["scheduled", "approved"],
  published: ["published"],
};

// Syarat lengkap draft (cermin validate submit tanpa jadwal): judul +
// caption + media sesuai tipe. Tampil di kartu agar terlihat kurangnya apa.
export function missingDraftFields(c: ManagedContent, th?: ContentThumb): string[] {
  const missing: string[] = [];
  if (!c.title.trim()) missing.push("judul");
  if (!c.caption.trim()) missing.push("caption");
  const hasVisual = !!c.igMediaId || !!th?.driveFileId;
  if (c.type === "feed") {
    if (!hasVisual) missing.push("gambar");
  } else if (c.type === "reels") {
    if (!c.igMediaId && th?.kind !== "video") missing.push("video");
  } else if ((c.slides ?? 0) < 2 || !hasVisual) {
    missing.push("slide");
  }
  return missing;
}

// Thumbnail kartu: denyut abu hanya selama media benar-benar memuat.
// Berhenti (per kartu) saat media tampil ATAU gagal — opacity wadah takkan
// mewarisi denyut ke gambar yang sudah ada.
export function BoardMedia({
  icon: Icon,
  igUrl,
  igIsVideo,
  pv,
  th,
  className = "h-24 w-full",
  iconClassName = "h-5 w-5",
  roundedClassName = "rounded-lg",
}: {
  icon: typeof LayoutGrid;
  igUrl?: string;
  igIsVideo: boolean;
  pv?: IgPreview;
  th?: ContentThumb;
  className?: string;
  iconClassName?: string;
  roundedClassName?: string;
}) {
  const [loading, setLoading] = useState(true);
  const hasMedia = !!(igUrl || th?.driveFileId);
  const done = () => setLoading(false);
  const hide = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
    e.currentTarget.style.display = "none";
    done();
  };
  return (
    <span
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-zinc-200 dark:bg-zinc-800",
        roundedClassName,
        className,
        hasMedia && loading && "animate-pulse"
      )}
    >
      <span className="absolute inset-0 flex items-center justify-center transition-transform duration-300 ease-out group-hover:scale-[1.03]">
        <Icon className={cn("text-zinc-400", iconClassName)} />
        {igUrl ? (
          igIsVideo ? (
            <video
              src={pv?.mediaUrl}
              poster={pv?.thumbUrl}
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500"
              onLoadedData={(e) => {
                e.currentTarget.classList.remove("opacity-0");
                done();
              }}
              onError={hide}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={igUrl}
              alt=""
              loading="lazy"
              onLoad={(e) => {
                e.currentTarget.classList.remove("opacity-0");
                done();
              }}
              onError={hide}
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500"
            />
          )
        ) : th?.driveFileId ? (
          // Kartu board selalu pakai poster kecil (KB-an) — video maupun
          // gambar. Byte penuh hanya dibuka di halaman detail.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl(th.driveFileId)}
            alt=""
            loading="lazy"
            onLoad={(e) => {
              e.currentTarget.classList.remove("opacity-0");
              done();
            }}
            onError={hide}
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500"
          />
        ) : null}
      </span>
    </span>
  );
}

export function ContentBoard() {
  const [cols, setCols] = useState<Record<string, ManagedContent[]>>({
    draft: [],
    idea: [],
    scheduled: [],
    published: [],
  });
  const [totals, setTotals] = useState<Record<string, number>>({ draft: 0, idea: 0, scheduled: 0, published: 0 });
  const [moreBusy, setMoreBusy] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [selTypes, setSelTypes] = useState<ContentType[]>([]);
  const [selPics, setSelPics] = useState<string[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<ContentStatus | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [picOptions, setPicOptions] = useState<string[]>([]);
  const [scheduleTarget, setScheduleTarget] = useState<ManagedContent | null>(null);
  const [scheduleTo, setScheduleTo] = useState<"scheduled" | "idea">("scheduled");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [thumbs, setThumbs] = useState<Record<string, ContentThumb>>({});
  const [previews, setPreviews] = useState<Record<string, IgPreview>>({});
  // Foto profil per nama PIC (cocok ke profiles; tanpa foto = inisial).
  const avatarMap = useAvatarMap();
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const epoch = useRef(0);

  // Search di-debounce agar tiap ketikan tak menembak BE.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  // Fetch halaman-1 utk kolom tertentu; silent = tukar data diam-diam
  // (tanpa skeleton) — dipakai setelah pindah status.
  const loadColumns = useCallback(
    async (list: ContentStatus[], silent = false) => {
      epoch.current += 1;
      const my = epoch.current;
      if (!silent) setLoading(true);
      try {
        const res = await Promise.all(
          list.map(async (s) => ({
            s,
            r: await listContentsPage({
              page: 1,
              limit: PAGE_SIZE,
              types: selTypes,
              statuses: colStatuses[s],
              q: debouncedQ,
              pics: selPics,
            }),
          }))
        );
        if (my !== epoch.current) return;
        const nc: Record<string, ManagedContent[]> = {};
        const nt: Record<string, number> = {};
        const th: Record<string, ContentThumb> = {};
        const pv: Record<string, IgPreview> = {};
        for (const { s, r } of res) {
          // Status tak dikenal dinormalisasi (legacy → kolom board).
          nc[s] = r.items
            .map((c) => (LEGACY_STATUS[c.status] ? { ...c, status: LEGACY_STATUS[c.status] } : c))
            .filter((c) => c.status === s);
          nt[s] = r.total;
          Object.assign(th, r.thumbs);
          Object.assign(pv, r.previews);
        }
        setCols((p) => ({ ...p, ...nc }));
        setTotals((p) => ({ ...p, ...nt }));
        setThumbs((p) => ({ ...p, ...th }));
        setPreviews((p) => ({ ...p, ...pv }));
      } catch {
        if (my === epoch.current) showToast("Gagal memuat konten.", false);
      } finally {
        if (!silent && my === epoch.current) setLoading(false);
      }
    },
    [debouncedQ, selTypes, selPics]
  );

  // Fetch awal 4 kolom paralel; reset tiap filter berubah.
  useEffect(() => {
    // loadColumns me-reset state sync (pola yg sama dipakai di /content).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadColumns(statusFlow);
  }, [loadColumns]);

  useEffect(() => {
    listTeamNames().then((names) => {
      if (names.length > 0) setPicOptions(names);
    });
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const allCards = useMemo(() => statusFlow.flatMap((s) => cols[s] ?? []), [cols]);

  // Pindah optimistis: kartu langsung tampil denyut di kolom TUJUAN selagi
  // changeStatus + refresh berjalan. Gagal → refresh kembalikan data asli.
  function optimisticMove(card: ManagedContent, to: ContentStatus) {
    const from = card.status;
    if (from === to) return;
    setMovingId(card.id);
    setCols((p) => ({
      ...p,
      [from]: (p[from] ?? []).filter((c) => c.id !== card.id),
      [to]: [{ ...card, status: to }, ...(p[to] ?? [])],
    }));
    setTotals((p) => ({
      ...p,
      [from]: Math.max(0, (p[from] ?? 1) - 1),
      [to]: (p[to] ?? 0) + 1,
    }));
  }

  // Scroll mentok bawah kolom → tambah 5 berikutnya sampai habis.
  async function loadMore(status: ContentStatus) {
    const cur = cols[status]?.length ?? 0;
    if (loading || moreBusy[status] || cur >= (totals[status] ?? 0)) return;
    setMoreBusy((m) => ({ ...m, [status]: true }));
    const my = epoch.current;
    try {
      const r = await listContentsPage({
        page: Math.floor(cur / PAGE_SIZE) + 1,
        limit: PAGE_SIZE,
        types: selTypes,
        statuses: colStatuses[status],
        q: debouncedQ,
        pics: selPics,
      });
      if (my !== epoch.current) return;
      const normed = r.items
        .map((c) => (LEGACY_STATUS[c.status] ? { ...c, status: LEGACY_STATUS[c.status] } : c))
        .filter((c) => c.status === status);
      setCols((p) => ({ ...p, [status]: [...(p[status] ?? []), ...normed] }));
      setTotals((p) => ({ ...p, [status]: r.total }));
      setThumbs((p) => ({ ...p, ...r.thumbs }));
      setPreviews((p) => ({ ...p, ...r.previews }));
    } catch {
      if (my === epoch.current) showToast("Gagal memuat tambahan.", false);
    } finally {
      if (my === epoch.current) setMoreBusy((m) => ({ ...m, [status]: false }));
    }
  }

  function toggle<T>(list: T[], v: T, set: (x: T[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  async function onDropCol(e: React.DragEvent, to: ContentStatus) {
    e.preventDefault();
    setDropCol(null);
    const id = e.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    if (!id) return;
    const card = allCards.find((c) => c.id === id);
    if (!card || card.status === to) return;
    // Stok/Draft → Scheduled & Draft → Stok: lengkapi dulu via modal
    // (modal mengikuti arah: ke Stok tanpa tanggal/jam, ke Scheduled ada jam).
    // Stok/Scheduled → Draft ditolak oleh statusTransitions di bawah.
    if (to === "scheduled" && (card.status === "idea" || card.status === "draft")) {
      setScheduleTarget(card);
      setScheduleTo("scheduled");
      setScheduleOpen(true);
      return;
    }
    if (card.status === "draft" && to === "idea") {
      setScheduleTarget(card);
      setScheduleTo("idea");
      setScheduleOpen(true);
      return;
    }
    if (!statusTransitions[card.status].includes(to)) {
      showToast(`Tidak bisa pindah ${statusMeta[card.status].label} → ${statusMeta[to].label}`, false);
      return;
    }
    const from = card.status;
    optimisticMove(card, to);
    try {
      await changeStatus(id, to);
      showToast(`“${card.title}” → ${statusMeta[to].label}`, true);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Gagal mengubah status.", false);
    } finally {
      // Sinkronkan 2 kolom dgn data asli (sukses maupun gagal).
      await loadColumns([from, to], true);
      setMovingId(null);
    }
  }

  const hasFilter =
    query !== "" || selTypes.length + selPics.length > 0;

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 sm:w-64 dark:border-zinc-800 dark:bg-zinc-950">
          <Search className="h-4 w-4 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul, caption, PIC…"
            className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
          />
          {query && (
            <button aria-label="Hapus pencarian" onClick={() => setQuery("")}>
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
            Atur ulang filter
          </button>
        )}
        <ContentTabs active="board" />
      </div>

      {/* Columns: geser horizontal di layar kecil, selayar penuh 4 kolom di desktop */}
      {loading ? (
        <div className="flex items-start gap-3 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {statusFlow.map((s) => (
            <div key={s} className="w-64 shrink-0 space-y-2 sm:w-72 lg:w-auto lg:min-w-0">
              <div className="h-5 w-24 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
              <div className="h-32 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      ) : (
      <div className="flex items-start gap-3 overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {statusFlow.map((status) => {
          const cards = cols[status] ?? [];
          const total = totals[status] ?? 0;
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
                "w-64 shrink-0 overflow-hidden rounded-xl border sm:w-72 lg:w-auto lg:min-w-0",
                active
                  ? "border-brand-500"
                  : "border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/40"
              )}
            >
              <header className="flex items-center justify-between bg-zinc-100/80 px-3 py-2 dark:bg-[#212121]">
                <h3 className="text-sm font-semibold">{statusMeta[status].label}</h3>
                <span className="rounded-full bg-zinc-200/70 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                  {total}
                </span>
              </header>
              <div
                onScroll={(e) => {
                  const el = e.currentTarget;
                  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) void loadMore(status);
                }}
                className="max-h-[68vh] space-y-4 overflow-y-auto p-2"
              >
                {cards.length === 0 && (
                  <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-400 dark:border-zinc-700">
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
                  const missing = c.status === "draft" ? missingDraftFields(c, th) : [];
                  return (
                    <Link
                      key={c.id}
                      href={`/content/${c.id}`}
                      // Published terkunci (arsip) — konsisten dgn calendar.
                      draggable={c.status !== "published" && movingId !== c.id}
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
                        "group block overflow-hidden rounded-lg bg-transparent dark:bg-transparent",
                        dragId === c.id && "opacity-50",
                        movingId === c.id && "pointer-events-none animate-pulse",
                        c.status === "published" ? "cursor-default" : "cursor-grab"
                      )}
                    >
                      <BoardMedia icon={Icon} igUrl={igUrl} igIsVideo={igIsVideo} pv={pv} th={th} />
                      <span className="block space-y-1.5 pt-2">
                        <span className="block truncate text-sm font-medium">{c.title}</span>
                        {c.status === "draft" ? (
                          <span className="block truncate text-[11px] text-zinc-500">
                             {missing.length > 0 ? `Belum memiliki ${missing.join(", ")}` : "Lengkap, siap dipindah"}
                          </span>
                        ) : (
                          <span className="block text-[11px] text-zinc-500">
                            {c.scheduledDate ? formatDateFull(c.scheduledDate) : "Belum dijadwalkan"}
                          </span>
                        )}
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex min-w-0 items-center -space-x-1.5" title={c.pic}>
                            {picNames.map((n, i) => (
                              <AvatarPhoto
                                key={`${n}-${i}`}
                                name={n}
                                fallback={picInits[i] || n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                                url={avatarMap[n.toLowerCase()]}
                                className="h-5 w-5 bg-brand-100 text-[9px] font-semibold text-brand-700 ring-2 ring-white dark:bg-brand-950 dark:text-brand-300 dark:ring-zinc-950"
                              />
                            ))}
                          </span>
                          <TypeBadge type={c.type} className="shrink-0 px-1.5 py-0 text-[10px]" />
                        </span>
                      </span>
                    </Link>
                  );
                })}
                {moreBusy[status] && (
                  <div aria-label="Memuat konten" className="flex justify-center py-3">
                    <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                  </div>
                )}
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

      {/* Modal lengkapi-lalu-pindah (drop ke Stok/Scheduled) */}
      <ScheduleModal
        open={scheduleOpen}
        content={scheduleTarget}
        to={scheduleTo}
        onClose={() => setScheduleOpen(false)}
        onSubmitting={(c, to) => optimisticMove(c, to)}
        onScheduled={(title, from, to) => {
          void loadColumns([from, to], true).finally(() => setMovingId(null));
          showToast(`“${title}” → ${statusMeta[to].label}`, true);
        }}
        onSubmitError={(msg, from, to) => {
          void loadColumns([from, to], true).finally(() => setMovingId(null));
          showToast(msg, false);
        }}
        onExitComplete={() => setScheduleTarget(null)}
      />
    </div>
  );
}
