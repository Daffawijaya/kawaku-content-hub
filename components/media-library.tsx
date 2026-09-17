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
import {
  typeMeta,
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

function driveThumb(id: string) {
  return `/api/drive/thumb/${encodeURIComponent(id)}`;
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
    ? "rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
    : "rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800";

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
  return (
    <span
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br",
        asset.tone,
        size === "md" ? "h-28 w-full sm:h-32" : "h-10 w-10 rounded-lg"
      )}
    >
      <Icon className={cn("text-zinc-400", size === "md" ? "h-6 w-6" : "h-4 w-4")} />
      {real && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={driveThumb(asset.driveFileId)}
          alt=""
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
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
  const [type, setType] = useState<"all" | ContentType>("all");
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
        if (type !== "all" && a.type !== type) return false;
        if (month !== "all" && !a.uploadedAt.startsWith(month)) return false;
        const q = query.trim().toLowerCase();
        if (q && !`${a.name} ${a.uploadedBy}`.toLowerCase().includes(q)) return false;
        return true;
      }),
    [assets, query, kind, type, month]
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
          : { msg: `“${selected.name}” dihapus (database + Drive trash).`, tone: "ok" }
      );
      setMediaPhase("done");
      mediaTimer.current = setTimeout(() => setSelectedId(null), 3000);
    } catch (e) {
      // Gagal = kembali ke konfirmasi + error inline.
      setDeleteError(e instanceof Error ? e.message : "Hapus gagal.");
      setMediaPhase("confirm");
    }
  }

  const hasFilter = query !== "" || kind !== "all" || type !== "all" || month !== "all";

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
          <button aria-label="Dismiss" onClick={() => setNotice(null)} className="rounded p-0.5 hover:opacity-70">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Filter bar */}
      <div className="mb-4 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 sm:w-64 dark:border-zinc-800 dark:bg-zinc-950">
            <Search className="h-4 w-4 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search file, uploader…"
              className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
            />
            {query && (
              <button aria-label="Clear search" onClick={() => setQuery("")}>
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className={cn(input, "text-sm")} aria-label="Filter bulan">
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
            <button onClick={() => setLayout("grid")} aria-label="Grid view" className={cn("rounded p-1.5", layout === "grid" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500")}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setLayout("list")} aria-label="List view" className={cn("rounded p-1.5", layout === "list" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500")}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "image", "video"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={pill(kind === k)}>
              {k === "all" ? "All" : k === "image" ? "Images" : "Videos"}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-zinc-200 sm:block dark:bg-zinc-800" />
          <button onClick={() => setType("all")} className={pill(type === "all")}>All types</button>
          {(Object.keys(typeMeta) as ContentType[]).map((t) => (
            <button key={t} onClick={() => setType(type === t ? "all" : t)} className={pill(type === t)}>
              {typeMeta[t].label}
            </button>
          ))}
          {hasFilter && (
            <button
              onClick={() => {
                setQuery("");
                setKind("all");
                setType("all");
                setMonth("all");
              }}
              className="text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              Reset filter
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
          <p className="mt-1 text-xs text-zinc-500">Coba ubah kata kunci atau reset filter.</p>
        </Card>
      ) : layout === "grid" ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((a) => (
            <button key={a.id} onClick={() => setSelectedId(a.id)} className="text-left">
              <Card className="overflow-hidden transition-colors hover:border-zinc-300 dark:hover:border-zinc-700">
                <Thumb asset={a} size="md" />
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {a.kind === "image" ? "Image" : "Video"} • {a.sizeLabel} • {fmtDate(a.uploadedAt)}
                  </p>
                  {a.usedBy.length > 0 && (
                    <p className="mt-1 truncate text-xs text-brand-700 dark:text-brand-400">
                      Dipakai di {a.usedBy.length} konten
                    </p>
                  )}
                </div>
              </Card>
            </button>
          ))}
        </div>
      ) : (
        <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {filtered.map((a) => (
            <button key={a.id} onClick={() => setSelectedId(a.id)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900">
              <Thumb asset={a} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{a.name}</span>
                <span className="block text-xs text-zinc-500">
                  {a.kind === "image" ? "Image" : "Video"} • {a.sizeLabel} • {fmtDate(a.uploadedAt)} • {a.usedBy.length} konten
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
                  className={pillGlass}
                >
                  <HardDrive className="h-4 w-4" /> Open in Drive
                </a>
              ) : (
                <span className={cn(pillGlass, "opacity-50")} title="Aktif saat file tersimpan di Google Drive">
                  <HardDrive className="h-4 w-4" /> Open in Drive
                </span>
              )}
              <button
                type="button"
                onClick={askDelete}
                className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-rose-600 px-4 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] hover:bg-rose-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </>
          ) : (
            <DeleteConfirmFooter
              phase={mediaPhase}
              onCancel={() => setMediaPhase("detail")}
              onConfirm={() => void deleteSelected()}
            />
          )
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
                    <div className={cn("relative flex h-44 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br", selected.tone)}>
                      {selected.kind === "video" ? (
                        <Clapperboard className="h-10 w-10 text-zinc-400" />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-zinc-400" />
                      )}
                      {isRealDrive(selected) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={driveThumb(selected.driveFileId)}
                          alt={selected.name}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      <Badge>{selected.kind === "image" ? "Image" : "Video"}</Badge>
                      <TypeBadge type={selected.type} />
                      {selected.duration && <Badge>{selected.duration}</Badge>}
                    </div>
                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-zinc-500">File size</span>
                        <span className="font-medium">{selected.sizeLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-zinc-500"><CalendarDays className="h-3.5 w-3.5" /> Uploaded</span>
                        <span className="font-medium">{fmtDate(selected.uploadedAt)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-1.5 text-zinc-500"><User className="h-3.5 w-3.5" /> By</span>
                        <span className="font-medium">{selected.uploadedBy}</span>
                      </div>
                    </dl>
                    <div className="mt-4">
                      <p className="mb-1.5 text-xs font-medium text-zinc-500">
                        Related content ({selected.usedBy.length})
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
                        : "Upload media dari form tambah konten."}
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
