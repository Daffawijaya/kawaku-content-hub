"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Clapperboard,
  EllipsisVertical,
  ExternalLink,
  Eye,
  Images,
  LayoutGrid,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ContentTabs } from "@/components/content-tabs";
import { CreateModal } from "@/components/create-modal";
import { TopContentTable } from "@/components/top-content-table";
import { Pagination } from "@/components/ui/pagination";
import { DeleteConfirmBody, DeleteConfirmFooter } from "@/components/ui/delete-confirm";
import { ModalShell } from "@/components/ui/modal";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { StatusBadge, TypeBadge } from "@/components/ui/badge";
import { pillWhite } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDateFull } from "@/lib/format";
import { thumbUrl } from "@/lib/drive/thumb";
import {
  statusMeta,
  typeMeta,
  type ContentStatus,
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";
import { deleteContent, listContentsPage, type ContentThumb } from "@/lib/content-db";
import type { IgPreview } from "@/lib/instagram/client";

const typeIcons: Record<ContentType, typeof LayoutGrid> = {
  feed: LayoutGrid,
  carousel: Images,
  reels: Clapperboard,
};

const typeOptions: ContentType[] = ["feed", "carousel", "reels"];
const statusOptions: ContentStatus[] = ["draft", "idea", "scheduled", "published"];

const PAGE_SIZE = 10;

const pill = (active: boolean) =>
  active
    ? "rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

// Template grid kolom tabel /content — dipakai semua baris
// supaya tiap kolom sejajar. Urutan sel: konten, status, tipe, PIC, aksi.
// Kolom yg hidden di breakpoint kecil tidak mengisi sel grid.
const rowGrid =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:grid-cols-[minmax(0,1fr)_128px_40px] md:grid-cols-[minmax(0,1fr)_120px_128px_40px] lg:grid-cols-[minmax(0,1fr)_120px_100px_128px_40px]";

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
  const [selTypes, setSelTypes] = useState<ContentType[]>([]);
  const [selStatuses, setSelStatuses] = useState<ContentStatus[]>([]);
  // Satu halaman dari BE (filter + sort + pagination di server).
  const [items, setItems] = useState<ManagedContent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedContent | null>(null);
  // Satu modal, tiga fase beranimasi: konfirmasi → menghapus → berhasil.
  const [deletePhase, setDeletePhase] = useState<"confirm" | "deleting" | "done">("confirm");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteWarnings, setDeleteWarnings] = useState<string[]>([]);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openDelete(item: ManagedContent) {
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    setDeleteError(null);
    setDeleteWarnings([]);
    setDeletePhase("confirm");
    setDeleteTarget(item);
  }
  const [thumbs, setThumbs] = useState<Record<string, ContentThumb>>({});
  const [previews, setPreviews] = useState<Record<string, IgPreview>>({});
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  // Search di-debounce agar tiap ketikan tak menembak BE.
  const [debouncedQ, setDebouncedQ] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  function load() {
    setLoading(true);
    listContentsPage({
      page,
      limit: PAGE_SIZE,
      types: selTypes,
      statuses: selStatuses,
      q: debouncedQ,
    })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
        setThumbs(r.thumbs);
        setPreviews(r.previews);
        setLoadError(null);
      })
      .catch((e: unknown) => setLoadError(e instanceof Error ? e.message : "Gagal memuat konten."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // load() me-reset state sync (pola yg sama dipakai tombol "Coba lagi").
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedQ, selTypes, selStatuses]);

  async function removeContent() {
    if (!deleteTarget || deletePhase !== "confirm") return;
    const id = deleteTarget.id;
    setDeletePhase("deleting");
    setDeleteError(null);
    try {
      const warnings = await deleteContent(id);
      setItems((prev) => prev.filter((c) => c.id !== id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteWarnings(warnings);
      setDeletePhase("done");
      // Halaman jadi kosong → mundur (langsung, agar tetap jalan walau
      // sukses ditutup manual sebelum timer habis).
      if (items.length <= 1 && page > 1) setPage(page - 1);
      // Sukses tampil sejenak lalu tutup sendiri; list sudah terupdate.
      deleteTimer.current = setTimeout(() => {
        setDeleteTarget(null);
      }, 3000);
    } catch (e) {
      // Gagal = kembali ke konfirmasi + error inline (pola GitHub Primer).
      setDeleteError(e instanceof Error ? e.message : "Hapus gagal.");
      setDeletePhase("confirm");
    }
  }
  function toggle<T>(list: T[], v: T, set: (x: T[]) => void) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  // Kembali ke halaman 1 tiap filter berubah.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedQ, selTypes, selStatuses]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title="Konten"
        description="Kelola stok dan konten terjadwal KAWAKU."
        action={
          <button type="button" onClick={() => setCreateOpen(true)} className={pillWhite}>
            Buat Konten
          </button>
        }
      />

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
        {typeOptions.map((t) => (
          <button
            key={t}
            onClick={() => toggle(selTypes, t, setSelTypes)}
            className={pill(selTypes.includes(t))}
          >
            {typeMeta[t].label}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />
        {statusOptions.map((s) => (
          <button
            key={s}
            onClick={() => toggle(selStatuses, s, setSelStatuses)}
            className={pill(selStatuses.includes(s))}
          >
            {statusMeta[s].label}
          </button>
        ))}
        <ContentTabs active="list" />
      </div>

      {/* Baris lama dipertahankan + redup saat refresh agar scroll tidak lompat.
          Skeleton hanya saat data kosong (muat pertama). */}
      <div className={cn("transition-opacity", loading && items.length > 0 && "pointer-events-none opacity-60")}>
      <TopContentTable
        items={items.map((c) => ({ c }))}
        loading={loading && items.length === 0}
        insightsLoading={false}
        previews={{}}
        sort="newest"
        title="Daftar Konten"
        sortable={false}
        subtitle={loading && items.length === 0 ? "Memuat konten…" : `${total} konten`}
        expandable={false}
        emptyText={
          <div className="px-5 py-12 text-center">
            <p className="text-sm font-medium">Tidak ada konten yang cocok</p>
            <p className="mt-1 text-xs text-zinc-500">
              Coba ubah kata kunci atau longgarkan filter di atas.
            </p>
          </div>
        }
        error={
          loadError ? (
            <div className="px-5 py-12 text-center">
              <p className="text-sm font-medium">Gagal memuat dari Supabase</p>
              <p className="mt-1 text-xs text-zinc-500">{loadError}</p>
              <button
                onClick={() => load()}
                className="mt-3 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
              >
                Coba lagi
              </button>
            </div>
          ) : null
        }
        renderRow={({ c: item }) => {
          const Icon = typeIcons[item.type];
          const picNames = item.pic.split(",").map((s) => s.trim()).filter(Boolean);
          const picInits = item.initials.split(",").map((s) => s.trim());
          // Published (tertaut IG) → preview IG; stok/scheduled → thumbnail Drive.
          const pv = item.igMediaId ? previews[item.igMediaId] : undefined;
          const igUrl = pv?.mediaUrl || pv?.thumbUrl;
          const igIsVideo = (pv?.mediaType === "VIDEO" || pv?.mediaType === "REELS") && !!pv?.mediaUrl;
          const th = thumbs[item.id];
          const hideBroken = (e: React.SyntheticEvent<HTMLImageElement | HTMLVideoElement>) => {
            e.currentTarget.style.display = "none";
          };
          return (
            <div
              className={cn(
                rowGrid,
                "py-2.5 hover:bg-white/70 dark:hover:bg-zinc-800/60"
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br",
                    item.tone
                  )}
                >
                  <Icon className="h-4 w-4 text-zinc-500" />
                  {igUrl ? (
                    igIsVideo ? (
                      <>
                        {pv?.thumbUrl && (
                          // Cover dulu (thumbnail IG); video di atasnya, kalau
                          // video mati yang tampil cover, bukan hitam.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={pv.thumbUrl}
                            alt=""
                            loading="lazy"
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={hideBroken}
                          />
                        )}
                        <video
                          src={pv?.mediaUrl}
                          poster={pv?.thumbUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="absolute inset-0 h-full w-full bg-black object-cover"
                          onError={hideBroken}
                        />
                      </>
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.title}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {item.scheduledDate ? formatDateFull(item.scheduledDate) : "Belum dijadwalkan"}
                  </p>
                </div>
              </div>
              <div className="hidden min-w-0 md:block">
                <StatusBadge status={item.status} />
              </div>
              <div className="hidden min-w-0 lg:block">
                <TypeBadge type={item.type} />
              </div>
              <span className="hidden min-w-0 sm:block">
                <span className="flex items-center -space-x-1.5" title={item.pic}>
                  {picNames.map((n, i) => (
                    <span
                      key={`${n}-${i}`}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700 ring-2 ring-white dark:bg-brand-950 dark:text-brand-300 dark:ring-zinc-950"
                    >
                      {picInits[i] || n.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  ))}
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
                        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <EllipsisVertical className="h-4 w-4" />
                      </button>
                  )}
                >
                  <DropdownItem icon={<Eye className="h-3.5 w-3.5" />} href={`/content/${item.id}`}>
                    Detail
                  </DropdownItem>
                  <DropdownItem icon={<Pencil className="h-3.5 w-3.5" />} href={`/content/${item.id}/edit`}>
                    Ubah
                  </DropdownItem>
                  {item.publishedUrl && (
                    <DropdownItem icon={<ExternalLink className="h-3.5 w-3.5" />} href={item.publishedUrl} external>
                      Lihat di Instagram
                    </DropdownItem>
                  )}
                  <DropdownItem
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    danger
                    onClick={() => openDelete(item)}
                  >
                    Hapus
                  </DropdownItem>
                </Dropdown>
              </div>
            </div>
          );
        }}
      />
      <Pagination page={safePage} pageCount={pageCount} onChange={setPage} />
      </div>
      {/* Hapus 3 fase dalam satu modal: konfirmasi → menghapus → berhasil.
          Frame modal tetap terpasang, hanya isi yang crossfade (mode="wait",
          keluar easeIn + masuk easeOut) agar transisinya smooth tanpa kedip. */}
      <ModalShell
        open={deleteTarget !== null}
        label="Konfirmasi hapus konten"
        title="Hapus konten"
        size="sm"
        onClose={() => {
          if (deletePhase !== "deleting") setDeleteTarget(null);
        }}
        onExitComplete={() => {
          if (deleteTimer.current) clearTimeout(deleteTimer.current);
          setDeleteTarget(null);
          setDeleteError(null);
          setDeleteWarnings([]);
          setDeletePhase("confirm");
        }}
        footer={
          deletePhase === "confirm" ? (
            <DeleteConfirmFooter
              phase={deletePhase}
              onCancel={() => setDeleteTarget(null)}
              onConfirm={() => void removeContent()}
            />
          ) : null
        }
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={deletePhase}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: { ease: "easeOut", duration: 0.18 } }}
            exit={{ opacity: 0, scale: 0.97, transition: { ease: "easeIn", duration: 0.15 } }}
          >
            <DeleteConfirmBody phase={deletePhase} name={deleteTarget?.title ?? ""} scope="Konten" />
          </motion.div>
        </AnimatePresence>
        {deletePhase === "done" && deleteWarnings.length > 0 && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            {deleteWarnings.length} file Drive gagal dibersihkan otomatis — hapus manual dari Media Library.
          </p>
        )}
        {deleteError && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {deleteError}
          </p>
        )}
      </ModalShell>
      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          if (page !== 1) setPage(1);
          else load();
        }}
      />
    </div>
  );
}
