"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  ExternalLink,
  FileUp,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Search,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { Badge, TypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  MAX_UPLOAD_BYTES,
  contentLibrary,
  formatBytes,
  mediaLibrary,
  typeMeta,
  type ContentType,
  type MediaAsset,
  type MediaKind,
} from "@/lib/mock";

type Layout = "grid" | "list";
type QueueStatus = "ready" | "uploading" | "done" | "error";
type QueueItem = {
  key: number;
  name: string;
  sizeBytes: number;
  kind: MediaKind | null;
  file: File | null;
  progress: number;
  status: QueueStatus;
  error?: string;
};

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
  return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
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

export function MediaLibrary({
  uploadOpen,
  onCloseUpload,
}: {
  uploadOpen: boolean;
  onCloseUpload: () => void;
}) {
  const [assets, setAssets] = useState<MediaAsset[]>(mediaLibrary);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | MediaKind>("all");
  const [type, setType] = useState<"all" | ContentType>("all");
  const [month, setMonth] = useState("all");
  const [layout, setLayout] = useState<Layout>("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [drive, setDrive] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; tone: "ok" | "warn" | "err" } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const keyRef = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setInterval>>());
  const xhrs = useRef(new Map<number, XMLHttpRequest>());
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = timers.current;
    const x = xhrs.current;
    // Muat dari database bila login; fallback mock bila tidak.
    setLoadingList(true);
    fetch("/api/drive/list")
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { assets: ApiAsset[] };
        setAssets(json.assets.map(toMediaAsset));
      })
      .catch(() => {
        /* tetap mock */
      })
      .finally(() => setLoadingList(false));
    fetch("/api/drive/status")
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as { drive?: boolean } | null;
        setDrive(json?.drive === true);
      })
      .catch(() => undefined);
    return () => {
      for (const id of t.values()) clearInterval(id);
      for (const xhr of x.values()) xhr.abort();
    };
  }, []);
  useEffect(() => {
    if (!selectedId) {
      setConfirmDelete(false);
      setDeleteError(null);
    }
  }, [selectedId]);

  const contentById = useMemo(() => new Map(contentLibrary.map((c) => [c.id, c])), []);
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

  const selected = selectedId ? assets.find((a) => a.id === selectedId) ?? null : null;

  function addFiles(files: FileList | File[]) {
    const list = [...files];
    const items: QueueItem[] = list.map((f) => {
      const isImage = f.type.startsWith("image/");
      const isVideo = f.type.startsWith("video/");
      if (!isImage && !isVideo)
        return { key: keyRef.current++, name: f.name, sizeBytes: f.size, kind: null, file: null, progress: 0, status: "error" as const, error: "Tipe file harus gambar atau video." };
      if (f.size > MAX_UPLOAD_BYTES)
        return { key: keyRef.current++, name: f.name, sizeBytes: f.size, kind: isVideo ? "video" : "image", file: null, progress: 0, status: "error" as const, error: `Melebihi batas ${formatBytes(MAX_UPLOAD_BYTES)}.` };
      return { key: keyRef.current++, name: f.name, sizeBytes: f.size, kind: isVideo ? "video" : "image", file: f, progress: 0, status: "ready" as const };
    });
    setQueue((q) => [...items, ...q]);
  }

  function startUpload(key: number) {
    const item = queue.find((i) => i.key === key);
    if (!item || item.status === "uploading") return;
    // Mode Drive: upload beneran via API (progress XHR). Selain itu: simulasi mock.
    if (drive && item.file) {
      startDriveUpload(key, item.file);
      return;
    }
    setQueue((q) => q.map((i) => (i.key === key ? { ...i, status: "uploading" as const, error: undefined } : i)));
    const id = setInterval(() => {
      setQueue((q) =>
        q.map((i) => {
          if (i.key !== key || i.status !== "uploading") return i;
          const next = Math.min(100, i.progress + 12 + Math.round(Math.random() * 10));
          if (next >= 100) {
            clearInterval(timers.current.get(key));
            timers.current.delete(key);
            commitUpload(i);
            return { ...i, progress: 100, status: "done" as const };
          }
          return { ...i, progress: next };
        })
      );
    }, 220);
    timers.current.set(key, id);
  }

  function startDriveUpload(key: number, file: File) {
    setQueue((q) =>
      q.map((i) => (i.key === key ? { ...i, status: "uploading" as const, error: undefined, progress: 0 } : i))
    );
    const xhr = new XMLHttpRequest();
    xhrs.current.set(key, xhr);
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const progress = Math.round((e.loaded / e.total) * 100);
      setQueue((q) => q.map((i) => (i.key === key ? { ...i, progress } : i)));
    };
    xhr.onload = () => {
      xhrs.current.delete(key);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText) as { asset: ApiAsset };
          setAssets((a) => [toMediaAsset(json.asset), ...a]);
          setQueue((q) => q.map((i) => (i.key === key ? { ...i, progress: 100, status: "done" as const } : i)));
          setNotice({ msg: `“${file.name}” terupload ke Google Drive.`, tone: "ok" });
        } catch {
          setQueue((q) => q.map((i) => (i.key === key ? { ...i, status: "error" as const, error: "Respon server tidak valid." } : i)));
        }
      } else {
        let msg = `Upload gagal (HTTP ${xhr.status}).`;
        try {
          const json = JSON.parse(xhr.responseText) as { error?: string };
          if (json.error) msg = json.error;
        } catch {
          /* pakai default */
        }
        setQueue((q) => q.map((i) => (i.key === key ? { ...i, status: "error" as const, error: msg } : i)));
      }
    };
    xhr.onerror = () => {
      xhrs.current.delete(key);
      setQueue((q) =>
        q.map((i) => (i.key === key ? { ...i, status: "error" as const, error: "Jaringan gagal — coba lagi." } : i))
      );
    };
    const fd = new FormData();
    fd.append("file", file);
    fd.append("type", "feed");
    xhr.open("POST", "/api/drive/upload");
    xhr.send(fd);
  }

  function commitUpload(item: QueueItem) {
    if (!item.kind) return;
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const asset: MediaAsset = {
      id: `m-local-${item.key}`,
      name: item.name,
      kind: item.kind,
      type: "feed",
      sizeLabel: formatBytes(item.sizeBytes),
      sizeBytes: item.sizeBytes,
      uploadedAt: iso,
      uploadedBy: "Daffa Wijaya",
      tone: "from-zinc-200 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900",
      usedBy: [],
      driveFileId: "",
    };
    setAssets((a) => [asset, ...a]);
  }

  function cancelUpload(key: number) {
    const t = timers.current.get(key);
    if (t) clearInterval(t);
    timers.current.delete(key);
    const xhr = xhrs.current.get(key);
    if (xhr) xhr.abort();
    xhrs.current.delete(key);
    setQueue((q) => q.filter((i) => i.key !== key));
  }

  async function deleteSelected() {
    if (!selected) return;
    // Mode mock: hapus dari state saja.
    if (!isRealDrive(selected)) {
      setAssets((a) => a.filter((x) => x.id !== selected.id));
      setSelectedId(null);
      return;
    }
    // Mode Drive: database dulu, file di-trash setelahnya (di API).
    setDeleteError(null);
    try {
      const res = await fetch(`/api/drive/media/${selected.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; warning?: string; error?: string } | null;
      if (!res.ok || !json?.ok) throw new Error(json?.error ?? `Hapus gagal (HTTP ${res.status}).`);
      setAssets((a) => a.filter((x) => x.id !== selected.id));
      setSelectedId(null);
      setNotice(
        json.warning
          ? { msg: json.warning, tone: "warn" }
          : { msg: `“${selected.name}” dihapus (database + Drive trash).`, tone: "ok" }
      );
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Hapus gagal.");
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

      {/* Upload panel */}
      {uploadOpen && (
        <Card className="mb-4 p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold">
              Upload media
              {drive && (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  Google Drive
                </span>
              )}
            </p>
            <button aria-label="Close upload" onClick={onCloseUpload} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
            }}
            className={cn(
              "rounded-lg border border-dashed px-4 py-8 text-center transition-colors",
              dragActive
                ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/30"
                : "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900"
            )}
          >
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <Upload className="mx-auto h-5 w-5 text-zinc-400" />
            <p className="mt-2 text-sm font-medium">Seret file ke sini atau</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => fileRef.current?.click()}>
              <FileUp className="h-4 w-4" /> Browse files
            </Button>
            <p className="mt-2 text-xs text-zinc-500">
              Gambar/video, multiple, maks {formatBytes(MAX_UPLOAD_BYTES)} per file —{" "}
              {drive ? "tersimpan ke folder KAWAKU di Google Drive." : "mock, tidak benar-benar diupload."}
            </p>
          </div>
          {queue.length > 0 && (
            <ul className="mt-3 space-y-2">
              {queue.map((item) => (
                <li key={item.key} className="rounded-lg border border-zinc-200 p-2.5 text-sm dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-medium">{item.name}</p>
                    <span className="shrink-0 text-xs text-zinc-500">{formatBytes(item.sizeBytes)}</span>
                    {item.status === "ready" && (
                      <Button size="sm" onClick={() => startUpload(item.key)}>Upload</Button>
                    )}
                    {item.status === "uploading" && (
                      <Button size="sm" variant="outline" onClick={() => cancelUpload(item.key)}>Cancel</Button>
                    )}
                    {item.status === "done" && (
                      <button aria-label={`Remove ${item.name}`} onClick={() => cancelUpload(item.key)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    {item.status === "error" && (
                      <span className="flex shrink-0 gap-1">
                        {item.file && (
                          <Button size="sm" variant="outline" onClick={() => startUpload(item.key)}>Retry</Button>
                        )}
                        <button aria-label={`Remove ${item.name}`} onClick={() => cancelUpload(item.key)} className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                          <X className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </div>
                  {item.status === "error" ? (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{item.error}</p>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <div className={cn("h-full rounded-full", item.status === "done" ? "bg-brand-600" : "bg-sky-500")} style={{ width: `${item.progress}%` }} />
                      </div>
                      <span className="w-10 shrink-0 text-right text-xs text-zinc-500">
                        {item.status === "done" ? <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-brand-600" /> : `${item.progress}%`}
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

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

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={() => setSelectedId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white sm:rounded-2xl dark:bg-zinc-950"
          >
            <div className={cn("relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br", selected.tone)}>
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
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="break-all text-base font-semibold tracking-tight">{selected.name}</h3>
                <button aria-label="Close detail" onClick={() => setSelectedId(null)} className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
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
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {confirmDelete ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>Batal</Button>
                    <Button size="sm" onClick={deleteSelected} className="bg-rose-600 hover:bg-rose-700">
                      <Trash2 className="h-3.5 w-3.5" /> Ya, hapus
                    </Button>
                  </>
                ) : (
                  <>
                    {isRealDrive(selected) ? (
                      <a
                        href={driveView(selected.driveFileId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-md border border-zinc-200 px-3 text-xs font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800"
                      >
                        <HardDrive className="h-3.5 w-3.5" /> Open in Drive
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" disabled title="Aktif saat file tersimpan di Google Drive">
                        <HardDrive className="h-3.5 w-3.5" /> Open in Drive
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </>
                )}
              </div>
              {deleteError && (
                <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{deleteError}</p>
              )}
              <p className="mt-2 flex items-center gap-1 text-right text-[11px] text-zinc-400 sm:justify-end">
                <ExternalLink className="h-3 w-3" />{" "}
                {isRealDrive(selected)
                  ? "File tersimpan di folder KAWAKU Google Drive."
                  : "Drive aktif saat file diupload dengan integrasi terhubung."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
