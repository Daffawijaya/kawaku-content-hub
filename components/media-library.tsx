"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Badge, TypeBadge } from "@/components/ui/badge";
import { DeleteConfirmBody, DeleteConfirmFooter } from "@/components/ui/delete-confirm";
import { ModalShell } from "@/components/ui/modal";
import { pillGlass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { posterUrl } from "@/lib/drive/thumb";
import { FadeImg } from "@/components/ui/fade-media";
import {
  type ContentType,
  type ManagedContent,
  type MediaAsset,
  type MediaKind,
} from "@/lib/mock";
import { listContents } from "@/lib/content-db";

type Layout = "grid" | "list";

type ApiAsset = {
  id: string;
  name: string;
  kind: MediaKind;
  type: ContentType;
  size_bytes: number;
  size_label: string;
  duration: string | null;
  uploaded_at: string;
  uploaded_by: string;
  tone: string;
  drive_file_id: string;
  usedBy?: string[];
};

function isRealDrive(a: Pick<MediaAsset, "driveFileId">) {
  return !!a.driveFileId && !a.driveFileId.startsWith("drive_mock_");
}

function driveView(id: string) {
  return `https://drive.google.com/file/d/${id}/view`;
}

function toMediaAsset(r: ApiAsset): MediaAsset {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    type: r.type,
    sizeLabel: r.size_label,
    sizeBytes: r.size_bytes,
    duration: r.duration ?? undefined,
    uploadedAt: r.uploaded_at,
    uploadedBy: r.uploaded_by,
    tone: r.tone || "from-zinc-200 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900",
    usedBy: r.usedBy ?? [],
    driveFileId: r.drive_file_id,
  };
}

const pill = (active: boolean) =>
  active
    ? "rounded-lg bg-zinc-900 px-3 py-1 text-xs font-medium text-white min-h-[36px] sm:min-h-0 dark:bg-white dark:text-zinc-900"
    : "rounded-lg bg-zinc-100 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-200 min-h-[36px] sm:min-h-0 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700";

const input =
  "rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950";

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Thumb({ asset, size }: { asset: MediaAsset; size: "md" | "sm" }) {
  const Icon = asset.kind === "video" ? Clapperboard : ImageIcon;
  const real = isRealDrive(asset);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [asset.driveFileId]);
  const showImg = real && !failed;
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br",
        asset.tone,
        size === "md" ? "aspect-video w-full rounded-lg" : "h-10 w-10 rounded-lg",
        showImg && !loaded && "animate-pulse"
      )}
    >
      <Icon className={cn("text-zinc-400", size === "md" ? "h-6 w-6" : "h-4 w-4")} />
      {/* Grid/daftar selalu pakai poster kecil (KB-an), bukan byte penuh. */}
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterUrl(asset.driveFileId)}
          alt=""
          loading="lazy"
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth > 0) setLoaded(true);
            else setFailed(true);
          }}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
        />
      )}
      {asset.kind === "video" && asset.duration && (
        <span className="absolute bottom-1 right-1 z-10 rounded bg-black/60 px-1 text-[10px] font-medium text-white">
          {asset.duration}
        </span>
      )}
    </span>
  );
}

export function MediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [contents, setContents] = useState<ManagedContent[]>([]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | MediaKind>("all");
  const [month, setMonth] = useState("all");
  const [layout, setLayout] = useState<Layout>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Satu modal, empat fase: detail → konfirmasi → menghapus → berhasil
  // (pola yang sama dengan modal hapus konten).
  const [mediaPhase, setMediaPhase] = useState<"detail" | "confirm" | "deleting" | "done">("detail");
  const mediaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Salinan item yang baru dihapus agar fase berhasil tetap tampil
  // walau daftar sudah difilter (pola yang sama dengan modal hapus konten).
  const [goneAsset, setGoneAsset] = useState<MediaAsset | null>(null);
  const [drive, setDrive] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; tone: "ok" | "warn" | "err" } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setLoadingList(true);
    fetch("/api/drive/list")
      .then(async (res) => {
        if (!res.ok) throw new Error("Gagal memuat media.");
        const json = (await res.json()) as { assets: ApiAsset[] };
        setAssets(json.assets.map(toMediaAsset));
      })
      .catch((e: unknown) => {
        setAssets([]);
        setNotice({ msg: e instanceof Error ? e.message : "Gagal memuat media.", tone: "err" });
      })
      .finally(() => setLoadingList(false));
    listContents().then(setContents).catch(() => setContents([]));
    fetch("/api/drive/status")
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as { drive?: boolean } | null;
        setDrive(json?.drive === true);
      })
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    if (!selectedId) {
      if (mediaTimer.current) clearTimeout(mediaTimer.current);
      setMediaPhase("detail");
      setDeleteError(null);
      setGoneAsset(null);
    }
  }, [selectedId]);

  const contentById = useMemo(() => new Map(contents.map((c) => [c.id, c])), [contents]);
  const months = useMemo(() => {
    const set = new Set(assets.map((a) => a.uploadedAt.slice(0, 7)));
    return [...set].sort().reverse();
  }, [assets]);

  const filtered = useMemo(
    () =>
      assets.filter((a) => {
        if (kind !== "all" && a.kind !== kind) return false;
        if (month !== "all" && !a.uploadedAt.startsWith(month)) return false;
        const q = query.trim().toLowerCase();
        if (q && !`${a.name} ${a.uploadedBy}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [assets, query, kind, month]
  );

  const selected = selectedId ? assets.find((a) => a.id === selectedId) ?? goneAsset : goneAsset;

  function askDelete() {
    if (mediaTimer.current) clearTimeout(mediaTimer.current);
    setDeleteError(null);
    setMediaPhase("confirm");
  }

  async function deleteSelected() {
    if (!selected || mediaPhase !== "confirm") return;
    setMediaPhase("deleting");
    setDeleteError(null);
    // Mode mock: hapus dari state saja.
    if (!isRealDrive(selected)) {
      setGoneAsset(selected);
      setAssets((a) => a.filter((x) => x.id !== selected.id));
      setMediaPhase("done");
      mediaTimer.current = setTimeout(() => setSelectedId(null), 3000);
      return;
    }
    // Mode Drive: database dulu, file di-trash setelahnya (di API).
    try {
      const res = await fetch(`/api/drive/media/${selected.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; warning?: string; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Hapus gagal (HTTP ${res.status}).`);
      setGoneAsset(selected);
      setAssets((a) => a.filter((x) => x.id !== selected.id));
      setNotice(
        json.warning
          ? { msg: json.warning, tone: "warn" }
          : { msg: `“${selected.name}” dihapus (basis data + sampah Drive).`, tone: "ok" }
      );
      setMediaPhase("done");
      mediaTimer.current = setTimeout(() => setSelectedId(null), 3000);
    } catch (e) {
      // Gagal = kembali ke konfirmasi + error inline.
      setDeleteError(e instanceof Error ? e.message : "Hapus gagal.");
      setMediaPhase("confirm");
    }
  }

  const hasFilter =
    query !== "" || kind !== "all" || month !== "all";

  return (
    <div>
      {notice && (
        <div
          className={cn(
            "mb-4 flex items-start justify-between gap-2 rounded-lg border px-4 py-3 text-sm",
            notice.tone === "ok" &&
              "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200",
            notice.tone === "warn" &&
              "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
            notice.tone === "err" &&
              "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"
          )}
        >
          <span>{notice.msg}</span>
          <button aria-label="Tutup" onClick={() => setNotice(null)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:opacity-70 sm:h-auto sm:w-auto sm:p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-h-[44px] w-full items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 sm:w-64 sm:min-h-0 dark:border-zinc-800 dark:bg-zinc-950">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari file, pengunggah…"
              aria-label="Cari media"
              className="w-full bg-transparent text-[16px] text-zinc-900 outline-none placeholder:text-zinc-400 sm:text-sm dark:text-zinc-100"
            />
            {query && (
              <button aria-label="Hapus pencarian" onClick={() => setQuery("")} className="grid h-9 w-9 shrink-0 place-items-center rounded-full sm:h-auto sm:w-auto">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={cn(input, "min-h-[44px] flex-1 text-sm sm:min-h-0 sm:flex-none")} aria-label="Filter bulan">
            <option value="all">Semua bulan</option>
            {months.map((m) => {
              const [y, mo] = m.split("-").map(Number);
              const label = new Date(y, mo - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
              return (
                <option key={m} value={m}>{label}</option>
              );
            })}
          </select>
          <div className="ml-auto flex rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
            <button onClick={() => setLayout("grid")} aria-label="Tampilan grid" className={cn("grid min-h-[44px] min-w-[44px] place-items-center rounded p-1.5 sm:min-h-0 sm:min-w-0", layout === "grid" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setLayout("list")} aria-label="Tampilan daftar" className={cn("grid min-h-[44px] min-w-[44px] place-items-center rounded p-1.5 sm:min-h-0 sm:min-w-0", layout === "list" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500")}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="-mx-4 flex flex-nowrap items-center gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
          {(["all", "image", "video"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={cn(pill(kind === k), "shrink-0 sm:shrink")}>
              {k === "all" ? "Semua" : k === "image" ? "Gambar" : "Video"}
            </button>
          ))}
          {hasFilter && (
            <button
              onClick={() => {
                setQuery("");
                setKind("all");
                setMonth("all");
              }}
              className="shrink-0 text-xs font-medium text-brand-700 min-h-[36px] sm:min-h-0 hover:underline dark:text-brand-400"
            >
              Atur ulang filter
            </button>
          )}
        </div>
      </div>

      {/* Result */}
      <p className="mb-3 flex items-center gap-2 text-xs text-zinc-500">
        {loadingList ? (
          "Memuat media…"
        ) : (
          <>
            {filtered.length} dari {assets.length} aset
            {drive && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                Google Drive
              </span>
            )}
          </>
        )}
      </p>
      {filtered.length === 0 ? (
        <Card className="px-5 py-12 text-center">
          <p className="text-sm font-medium">Tidak ada media yang cocok</p>
          <p className="mt-1 text-xs text-zinc-500">Coba ubah kata kunci atau atur ulang filter.</p>
        </Card>
      ) : layout === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {filtered.map((a) => (
            <button key={a.id} onClick={() => setSelectedId(a.id)} className="group text-left">
              <Card className="relative overflow-visible rounded-lg border-0 bg-transparent shadow-none dark:border-0 dark:bg-transparent">
                <span
                  aria-hidden
                  className="absolute -inset-2 scale-[0.97] rounded-xl bg-zinc-900/[0.07] opacity-0 transition-all duration-300 ease-out group-hover:scale-100 group-hover:opacity-100 dark:bg-white/10"
                />
                <span className="relative block">
                <Thumb asset={a} size="md" />
                <div className="pt-2">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {a.kind === "image" ? "Gambar" : "Video"} • {a.sizeLabel} • {fmtDate(a.uploadedAt)}
                  </p>
                </div>
                </span>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <Card className="border-0 bg-transparent shadow-none dark:border-0 dark:bg-transparent">
          {filtered.map((a) => (
            <button key={a.id} onClick={() => setSelectedId(a.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <Thumb asset={a} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{a.name}</span>
                <span className="block text-xs text-zinc-500">
                  {a.kind === "image" ? "Gambar" : "Video"} • {a.sizeLabel} • {fmtDate(a.uploadedAt)}
                </span>
              </span>
              <TypeBadge type={a.type} />
              <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
            </button>
          ))}
        </Card>
      )}

      {/* Detail modal — cangkang ModalShell + fase hapus sama seperti modal hapus konten */}
      <ModalShell
        open={selected !== null}
        label={selected?.name ?? "Detail media"}
        title={selected?.name ?? "Detail media"}
        size="sm"
        onClose={() => {
          if (mediaPhase !== "deleting") setSelectedId(null);
        }}
        onExitComplete={() => {
          if (mediaTimer.current) clearTimeout(mediaTimer.current);
          setSelectedId(null);
          setDeleteError(null);
          setGoneAsset(null);
          setMediaPhase("detail");
        }}
        footer={
          !selected ? null : mediaPhase === "detail" ? (
            <>
              {isRealDrive(selected) ? (
                <a
                  href={driveView(selected.driveFileId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${pillGlass} min-h-[44px] sm:min-h-0`}
                >
                  <HardDrive className="h-4 w-4" /> Buka di Drive
                </a>
              ) : (
                <span className={`${pillGlass} min-h-[44px] opacity-50 sm:min-h-0`} title="Aktif saat file tersimpan di Google Drive">
                  <HardDrive className="h-4 w-4" /> Buka di Drive
                </span>
              )}
              <button
                type="button"
                onClick={askDelete}
                className="inline-flex h-9 min-h-[44px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-rose-600 px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] hover:bg-rose-700 disabled:opacity-50 sm:min-h-0"
              >
                <Trash2 className="h-4 w-4" /> Hapus
              </button>
            </>
          ) : mediaPhase === "confirm" ? (
            <DeleteConfirmFooter
              phase={mediaPhase}
              onCancel={() => setMediaPhase("detail")}
              onConfirm={() => void deleteSelected()}
            />
          ) : null
        }
      >
        {selected && (
          <>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mediaPhase}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1, transition: { ease: "easeOut", duration: 0.18 } }}
                exit={{ opacity: 0, scale: 0.97, transition: { ease: "easeIn", duration: 0.15 } }}
              >
                {mediaPhase === "detail" ? (
                  <>
                    <FadeImg
                      src={isRealDrive(selected) ? posterUrl(selected.driveFileId) : null}
                      alt={selected.name}
                      className="h-44 rounded-xl"
                      fallback={
                        selected.kind === "video" ? (
                          <Clapperboard className="h-10 w-10 text-zinc-400" />
                        ) : (
                          <ImageIcon className="h-10 w-10 text-zinc-400" />
                        )
                      }
                    />
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <Badge>{selected.kind === "image" ? "Gambar" : "Video"}</Badge>
                      <TypeBadge type={selected.type} />
                      {selected.duration && <Badge>{selected.duration}</Badge>}
                    </div>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-zinc-500">Ukuran file</span>
                        <span className="font-medium">{selected.sizeLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-zinc-500"><CalendarDays className="h-3.5 w-3.5" /> Diunggah</span>
                        <span className="font-medium">{fmtDate(selected.uploadedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-zinc-500"><User className="h-3.5 w-3.5" /> Oleh</span>
                        <span className="font-medium">{selected.uploadedBy}</span>
                      </div>
                    </dl>
                    <div className="mt-4">
                      <p className="mb-1.5 text-xs font-medium text-zinc-500">
                        Konten terkait ({selected.usedBy.length})
                      </p>
                      {selected.usedBy.length === 0 ? (
                        <p className="text-xs text-zinc-500">Belum dipakai konten mana pun.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {selected.usedBy.map((id) => {
                            const c = contentById.get(id);
                            if (!c) return null;
                            return (
                              <li key={id}>
                                <Link href="/content" className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
                                  <span className="truncate font-medium">{c.title}</span>
                                  <TypeBadge type={c.type} className="shrink-0 px-1.5 py-0 text-[10px]" />
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <p className="mt-4 flex items-center gap-1 text-[11px] text-zinc-400">
                      <ExternalLink className="h-3 w-3" />{" "}
                      {isRealDrive(selected)
                        ? "File tersimpan di folder KAWAKU Google Drive."
                        : "Unggah media dari form tambah konten."}
                    </p>
                  </>
                ) : (
                  <DeleteConfirmBody
                    phase={mediaPhase}
                    name={selected.name}
                    scope="Media"
                    extraConfirm={
                      selected.usedBy.length > 0 ? (
                        <p className="mt-2 text-[11px] text-amber-600 dark:text-amber-400">
                          Dipakai di {selected.usedBy.length} konten — relasinya ikut terputus.
                        </p>
                      ) : (
                        <p className="mt-2 text-[11px] text-zinc-400">File Drive ikut di-trash.</p>
                      )
                    }
                  />
                )}
              </motion.div>
            </AnimatePresence>
            {deleteError && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
                {deleteError}
              </p>
            )}
          </>
        )}
      </ModalShell>
    </div>
  );
}
