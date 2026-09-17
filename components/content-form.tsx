"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type DragEvent } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clapperboard,
  FolderOpen,
  ImagePlus,
  Images,
  LayoutGrid,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { MediaPicker, type PickerAsset } from "@/components/media-picker";
import { Segmented, type SegmentedOption } from "@/components/ui/segmented";
import { Button, pillGlass, pillWhite } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  MAX_UPLOAD_BYTES,
  categories,
  typeMeta,
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";
import { listTeamNames } from "@/lib/team-db";
import { getBrowserClient } from "@/lib/supabase/client";
import { thumbUrl } from "@/lib/drive/thumb";
import { loadSettings } from "@/lib/settings-store";

const typeOptions: SegmentedOption<ContentType>[] = [
  { value: "feed", label: "Feed", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
  { value: "carousel", label: "Carousel", icon: <Images className="h-3.5 w-3.5" /> },
  { value: "reels", label: "Reels", icon: <Clapperboard className="h-3.5 w-3.5" /> },
];

const input =
  "w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-500 dark:border-zinc-800 dark:text-zinc-100";
const inputError = "border-rose-400 focus:border-rose-500";
const label = "mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300";
const errText = "mt-1 text-xs text-rose-600 dark:text-rose-400";
// Section flat ala analytics: divider rambut antar grup field.
const section = "mt-8 border-t border-zinc-200 pt-5 dark:border-zinc-800";

export type SlideValue = { id: number; name: string };

export type SaveMode = "submit" | "bank";

export type ContentFormValues = {
  type: ContentType;
  title: string;
  caption: string;
  hashtags: string;
  category: string;
  pics: string[]; // PIC bisa banyak orang
  date: string;
  time: string;
  notes: string;
  mediaName: string;
  videoName: string;
  coverName: string;
  slides: SlideValue[];
  mediaIds: string[]; // id aset Media Library / Drive yang dipilih
};

export const emptyFormValues: ContentFormValues = {
  type: "feed",
  title: "",
  caption: "",
  hashtags: "",
  category: categories[0],
  pics: [],
  date: "",
  time: "",
  notes: "",
  mediaName: "",
  videoName: "",
  coverName: "",
  slides: [
    { id: 1, name: "" },
    { id: 2, name: "" },
  ],
  mediaIds: [],
};

// Judul otomatis dari baris pertama caption (mode compact tak ada input title).
export function titleFromCaption(caption: string): string {
  const first = caption
    .split("\n")
    .map((s) => s.trim())
    .find(Boolean) ?? "";
  if (!first) return "Tanpa judul";
  return first.length > 60 ? `${first.slice(0, 60)}…` : first;
}

// "2026-09-16" → "16 September" untuk preview.
function fmtPreviewDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso || "—";
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
  });
}

// Nilai awal form dari konten existing (nama file slide = placeholder mock)
export function valuesFromContent(c: ManagedContent): ContentFormValues {
  const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const count = c.type === "carousel" ? Math.max(2, c.slides ?? 2) : 2;
  return {
    type: c.type,
    title: c.title,
    caption: c.caption,
    hashtags: c.hashtags,
    category: c.category,
    pics: c.pic
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    date: c.scheduledDate,
    time: c.scheduledTime,
    notes: c.notes,
    mediaName: "",
    videoName: "",
    coverName: "",
    slides: Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `${slug}-slide-${i + 1}.jpg`,
    })),
    mediaIds: [],
  };
}

// Patch siap simpan ke store/backend (category tidak ikut: tak lagi diedit di form)
export function valuesToPatch(v: ContentFormValues): Partial<ManagedContent> {
  return {
    type: v.type,
    title: v.title.trim(),
    caption: v.caption,
    hashtags: v.hashtags,
    pic: v.pics.join(", "),
    scheduledDate: v.date,
    scheduledTime: v.time,
    notes: v.notes,
    ...(v.type === "carousel" ? { slides: v.slides.length } : {}),
  };
}

// PIC otomatis dari akun yg login — cocokkan ke nama tim, fallback nama
// akun / anggota pertama.
async function resolveAutoPic(teamNames: string[]): Promise<string | null> {
  try {
    const supabase = getBrowserClient();
    const { data } = (await supabase?.auth.getUser()) ?? {};
    const fullName = (
      data?.user?.user_metadata?.full_name as string | undefined
    )?.trim();
    if (!fullName) return teamNames[0] ?? null;
    const hit = teamNames.find((n) => n.toLowerCase() === fullName.toLowerCase());
    return hit ?? fullName;
  } catch {
    return teamNames[0] ?? null;
  }
}

// File drop pertama yg cocok accept ("video/*" saja / "image/*" saja / keduanya).
function droppedFile(e: DragEvent, accept: string): File | null {
  const f = e.dataTransfer.files?.[0];
  if (!f) return null;
  const wantVideo = accept.includes("video/");
  const wantImage = accept.includes("image/");
  if (wantVideo && !wantImage && !f.type.startsWith("video/")) return null;
  if (wantImage && !wantVideo && !f.type.startsWith("image/")) return null;
  return f;
}

type UploadedAsset = { id: string; name: string };

// Upload beneran ke Drive via API (mengembalikan id aset media_assets).
async function uploadToDriveApi(file: File, type: string): Promise<UploadedAsset> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("type", type);
  const res = await fetch("/api/drive/upload", { method: "POST", body: fd });
  const json = (await res.json().catch(() => null)) as
    | { asset?: { id: string; name: string }; error?: string }
    | null;
  if (!res.ok || !json?.asset) throw new Error(json?.error ?? `Upload gagal (HTTP ${res.status}).`);
  return { id: json.asset.id, name: json.asset.name };
}

// Preview file lokal (object URL) atau thumbnail Drive aset library.
function PreviewMedia({ file, driveFileId, aspect, autoPlay }: { file: File | null; driveFileId: string | null; aspect: string; autoPlay?: boolean }) {
  // Buat URL di effect (bukan useMemo): StrictMode dev me-remount effect 2x,
  // pola memo+revoke justru mencabut URL yang masih dipakai.
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setLocalUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setLocalUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const src = localUrl ?? (driveFileId ? thumbUrl(driveFileId) : null);
  const isVideo = file ? file.type.startsWith("video/") : false;
  if (src && !isVideo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt=""
        className={cn("h-full w-full object-cover", aspect)}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    );
  }
  if (src) {
    return <ToggleVideo src={src} autoPlay={autoPlay} className={cn("h-full w-full bg-black object-contain", aspect)} />;
  }
  return null;
}

// Video preview tanpa kontrol native — klik = play/pause. Tanpa muted agar bersuara.
function ToggleVideo({ src, autoPlay, className }: { src: string; autoPlay?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  return (
    <video
      ref={ref}
      src={src}
      loop
      playsInline
      preload="auto"
      autoPlay={autoPlay}
      onClick={() => {
        const v = ref.current;
        if (!v) return;
        if (v.paused) void v.play();
        else v.pause();
      }}
      className={cn(className, "cursor-pointer")}
    />
  );
}

// Rasio dimensi file lokal (lebar/tinggi) untuk kotak preview.
// Dibaca sekali via object URL sementara, lalu dicabut.
function useMediaRatio(file: File | null): number | null {
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    if (!file) {
      setRatio(null);
      return;
    }
    const url = URL.createObjectURL(file);
    let done = false;
    const finish = (w: number, h: number) => {
      if (!done && w > 0 && h > 0) {
        done = true;
        // Jepit ke rentang feed IG (4:5 – 1.91:1) biar kotak tidak ekstrem.
        setRatio(Math.min(1.91, Math.max(0.8, w / h)));
      }
      URL.revokeObjectURL(url);
    };
    if (file.type.startsWith("video/")) {
      const v = document.createElement("video");
      v.muted = true;
      v.preload = "metadata";
      v.src = url;
      v.onloadedmetadata = () => finish(v.videoWidth, v.videoHeight);
      v.onerror = () => URL.revokeObjectURL(url);
    } else {
      const img = new window.Image();
      img.onload = () => finish(img.naturalWidth, img.naturalHeight);
      img.onerror = () => URL.revokeObjectURL(url);
      img.src = url;
    }
  }, [file]);
  return ratio;
}

// Thumbnail kecil file lokal (belum diupload).
function LocalThumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  if (!url) return null;
  if (file.type.startsWith("video/")) {
    return <video src={url} muted playsInline className="h-10 w-10 shrink-0 rounded-md bg-black object-cover" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={file.name} className="h-10 w-10 shrink-0 rounded-md object-cover" />;
}

function Dropzone({
  label,
  fileName,
  file,
  accept,
  disabled,
  onPick,
  onClear,
}: {
  label: string;
  fileName: string;
  file: File | null;
  accept: string;
  disabled?: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  // Preview lokal (belum diupload) — URL dibuat dari File di browser saja.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const isVideo = file?.type.startsWith("video/") ?? false;
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className="flex flex-1 flex-col"
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (disabled) return;
        const f = droppedFile(e, accept);
        if (f) onPick(f);
      }}
    >
      {file && previewUrl ? (
        <div className="flex items-center gap-3 rounded-lg border-2 border-zinc-200 p-2 dark:border-zinc-800">
          {isVideo ? (
            <video src={previewUrl} controls muted loop playsInline preload="metadata" className="h-16 w-16 shrink-0 rounded-md bg-black object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt={file.name} className="h-16 w-16 shrink-0 rounded-md object-cover" />
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            aria-label={`Hapus pilihan ${file.name}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
      <label className={cn("flex min-h-[82px] flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-transparent px-4 py-1.5 text-center transition-colors hover:border-brand-500 hover:bg-brand-50/50 dark:border-zinc-700 dark:bg-transparent dark:hover:border-brand-600", dragging && "border-brand-500 bg-brand-50/50 dark:border-brand-600")}>
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) onPick(f);
          }}
        />
        {fileName ? (
          <span className="inline-flex max-w-full items-center gap-2 text-sm font-medium">
            <ImagePlus className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="truncate">{fileName}</span>
            <span
              role="button"
              tabIndex={0}
              aria-label={`Hapus pilihan ${fileName}`}
              onClick={(e) => {
                e.preventDefault();
                onClear();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClear();
                }
              }}
              className="shrink-0 rounded-md p-1 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4" />
            </span>
          </span>
        ) : (
          <span>
            <Upload className="mx-auto h-6 w-6 text-zinc-400" />
            <span className="mt-1.5 block text-xs font-medium">{label}</span>
          </span>
        )}
      </label>
      )}
    </div>
  );
}

export function ContentForm({
  initial = {},
  cancelHref,
  onCancel,
  submitLabel,
  onSubmit,
  contentId,
  modeSelect = false,
  compact = false,
  scheduleFlow = false,
}: {
  initial?: Partial<ContentFormValues>;
  cancelHref: string;
  // Pengganti Link Cancel (mis. tutup modal) — bila diisi, Cancel jadi button.
  onCancel?: () => void;
  submitLabel: string;
  onSubmit: (values: ContentFormValues, mode: SaveMode) => void;
  contentId?: string;
  modeSelect?: boolean;
  // Mode ringkas ala posting IG (dipakai /content/create): hanya tipe, media,
  // caption, jadwal. Title dari caption, hashtag di caption, tanpa notes,
  // PIC otomatis dari akun, tanpa toggle Stok/Jadwalkan.
  compact?: boolean;
  // Alur stok → scheduled (modal board): tipe dikunci + tanpa tombol Stok.
  scheduleFlow?: boolean;
}) {
  const init = { ...emptyFormValues, ...initial };
  // Preferensi Settings (hanya saat create — initial tidak mengisi).
  if (initial.type === undefined) {
    const stored = loadSettings();
    if ((Object.keys(typeMeta) as ContentType[]).includes(stored.prefs.defaultType)) {
      init.type = stored.prefs.defaultType;
    }
    if (stored.prefs.defaultCategory) init.category = stored.prefs.defaultCategory;
  }
  const [contentType, setContentType] = useState<ContentType>(init.type);
  // Mode create: pilih tujuan dulu — Stok (minimal) atau Jadwalkan.
  const [target, setTarget] = useState<"bank" | "schedule">("schedule");
  const [title, setTitle] = useState(init.title);
  const [caption, setCaption] = useState(init.caption);
  const [hashtags, setHashtags] = useState(init.hashtags);
  const [category] = useState(init.category);
  const [pics, setPics] = useState<string[]>(init.pics);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const [notes, setNotes] = useState(init.notes);
  const [mediaName, setMediaName] = useState(init.mediaName);
  const [videoName, setVideoName] = useState(init.videoName);
  const [coverName, setCoverName] = useState(init.coverName);
  const [slides, setSlides] = useState<SlideValue[]>(init.slides);
  const [mediaIds, setMediaIds] = useState<string[]>(init.mediaIds);
  const [pickedThumb, setPickedThumb] = useState<string | null>(null);
  // Aset yang sudah terpasang (mode edit): tampil di preview, ikut tersimpan
  // ulang, bisa dilepas — yang dilepas & yatim dibersihkan server saat Save.
  const [attached, setAttached] = useState<{ id: string; name: string; driveFileId: string }[]>([]);
  const [pickerFor, setPickerFor] = useState<"media" | "video" | "cover" | number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [drive, setDrive] = useState(false);
  const [picOptions, setPicOptions] = useState<string[]>([]);
  // File mentah pilihan user — baru diupload ke Drive saat tombol aksi ditekan.
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [slideFiles, setSlideFiles] = useState<Record<number, File>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Highlight drag-n-drop: input feed + id slide carousel yg sedang ditarget.
  const [feedDrag, setFeedDrag] = useState(false);
  const [dropSlide, setDropSlide] = useState<number | null>(null);
  const slideId = useRef(Math.max(...init.slides.map((s) => s.id), 0) + 1);

  useEffect(() => {
    fetch("/api/drive/status")
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as { drive?: boolean } | null;
        setDrive(json?.drive === true);
      })
      .catch(() => undefined);
    listTeamNames().then((names) => {
      if (names.length > 0) setPicOptions(names);
      if (compact) {
        void resolveAutoPic(names).then((n) => {
          if (n) setPics((prev) => (prev.length > 0 ? prev : [n]));
        });
      }
    });
  }, [compact]);

  useEffect(() => {
    if (!contentId) return;
    fetch(`/api/content/${contentId}/media`)
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const json = (await res.json()) as {
          assets?: { id: string; name: string; drive_file_id: string }[];
        };
        const list = (json.assets ?? []).map((a) => ({
          id: a.id,
          name: a.name,
          driveFileId: a.drive_file_id && !a.drive_file_id.startsWith("drive_mock_") ? a.drive_file_id : "",
        }));
        setAttached(list);
        setMediaIds((prev) => [...prev, ...list.map((a) => a.id).filter((id) => !prev.includes(id))]);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  function addMediaId(id: string) {
    setMediaIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function pickAsset(a: PickerAsset) {
    addMediaId(a.id);
    // Mock (drive_mock_*) bukan file Drive beneran — jangan dijadikan thumbnail.
    setPickedThumb(a.driveFileId && !a.driveFileId.startsWith("drive_mock_") ? a.driveFileId : null);
    if (pickerFor === "media") setMediaName(a.name);
    else if (pickerFor === "video") setVideoName(a.name);
    else if (pickerFor === "cover") setCoverName(a.name);
    else if (typeof pickerFor === "number")
      setSlides((prev) => prev.map((p) => (p.id === pickerFor ? { ...p, name: a.name } : p)));
  }

  function validate(mode: SaveMode) {
    const e: Record<string, string> = {};
    if (!compact && !title.trim()) e.title = "Title wajib diisi.";
    if (mode !== "bank" && pics.length === 0) e.pic = "PIC tidak terisi otomatis — coba muat ulang.";
    if (mode === "submit") {
      if (!caption.trim()) e.caption = "Caption wajib diisi.";
      if (!date) e.date = "Tanggal schedule wajib diisi.";
      if (!time) e.time = "Jam schedule wajib diisi.";
      // Jadwalkan wajib ada media: file baru, pilihan library, atau yang terpasang.
      const hasNewFile =
        !!mediaFile || !!videoFile || !!coverFile || Object.keys(slideFiles).length > 0;
      if (!hasNewFile && mediaIds.length === 0) {
        e.media = "Jadwalkan wajib ada media — pilih file atau dari Media Library.";
      }
      if (contentType === "carousel") {
        if (slides.length < 2) e.slides = "Carousel minimal 2 slide.";
        else if (slides.some((s) => !s.name))
          e.slides = "Semua slide harus punya media (pilih file tiap slide).";
      }
    }
    return e;
  }

  function collect(extraIds: string[] = []): ContentFormValues {
    return {
      type: contentType,
      title: compact ? titleFromCaption(caption) : title,
      caption,
      hashtags: compact ? "" : hashtags,
      category,
      pics,
      date,
      time,
      notes: compact ? "" : notes,
      mediaName,
      videoName,
      coverName,
      slides,
      mediaIds: [...mediaIds, ...extraIds.filter((id) => !mediaIds.includes(id))],
    };
  }

  function togglePic(name: string) {
    setPics((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  }

  function pickMediaFile(f: File) {
    setMediaFile(f);
    setMediaName(f.name);
    setPickedThumb(null);
  }

  function pickSlideFile(id: number, f: File) {
    setSlideFiles((prev) => ({ ...prev, [id]: f }));
    setPickedThumb(null);
    setSlides((prev) => prev.map((p) => (p.id === id ? { ...p, name: f.name } : p)));
  }

  // Upload file-file yang relevan dengan tipe konten, berurutan.
  async function uploadPending(): Promise<{
    single: Partial<Pick<ContentFormValues, "mediaName" | "videoName" | "coverName">>;
    slideNames: Record<number, string>;
    ids: string[];
  }> {
    const single: Partial<Pick<ContentFormValues, "mediaName" | "videoName" | "coverName">> = {};
    const slideNames: Record<number, string> = {};
    const ids: string[] = [];
    const jobs: { file: File; done: (name: string) => void }[] = [];
    if (contentType === "feed") {
      if (mediaFile) jobs.push({ file: mediaFile, done: (n) => { single.mediaName = n; } });
    } else if (contentType === "reels") {
      if (videoFile) jobs.push({ file: videoFile, done: (n) => { single.videoName = n; } });
      if (coverFile) jobs.push({ file: coverFile, done: (n) => { single.coverName = n; } });
    } else {
      for (const s of slides) {
        const f = slideFiles[s.id];
        if (f) jobs.push({ file: f, done: (n) => { slideNames[s.id] = n; } });
      }
    }
    for (const j of jobs) {
      if (j.file.size > MAX_UPLOAD_BYTES) {
        const mb = Math.round(MAX_UPLOAD_BYTES / 1048576);
        throw new Error(`"${j.file.name}" melebihi batas ${mb} MB.`);
      }
      const a = await uploadToDriveApi(j.file, contentType);
      j.done(a.name);
      ids.push(a.id);
    }
    return { single, slideNames, ids };
  }

  async function handleSave(mode: SaveMode) {
    const e = validate(mode);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    // Mode mock / tanpa file: langsung simpan.
    const needUpload =
      drive &&
      (contentType === "feed" ? !!mediaFile
        : contentType === "reels" ? !!videoFile || !!coverFile
        : Object.keys(slideFiles).length > 0);
    if (!needUpload) {
      onSubmit(collect(), mode);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const { single, slideNames, ids } = await uploadPending();
      const nextSlides = slides.map((s) =>
        slideNames[s.id] !== undefined ? { ...s, name: slideNames[s.id] } : s
      );
      setSlides(nextSlides);
      if (single.mediaName !== undefined) setMediaName(single.mediaName);
      if (single.videoName !== undefined) setVideoName(single.videoName);
      if (single.coverName !== undefined) setCoverName(single.coverName);
      const values = collect(ids);
      if (single.mediaName !== undefined) values.mediaName = single.mediaName;
      if (single.videoName !== undefined) values.videoName = single.videoName;
      if (single.coverName !== undefined) values.coverName = single.coverName;
      values.slides = nextSlides;
      onSubmit(values, mode);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload ke Drive gagal — konten belum disimpan.");
    } finally {
      setUploading(false);
    }
  }

  function moveSlide(id: number, dir: -1 | 1) {
    setSlides((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const filledSlides = slides.filter((s) => s.name).length;
  const [previewSlide, setPreviewSlide] = useState(0);
  // Mode compact: tombol Jadwalkan hanya muncul bila seluruh syarat submit terpenuhi.
  const canSchedule = compact && Object.keys(validate("submit")).length === 0;

  // File untuk preview panel: lokal dulu, pilihan library, lalu yang terpasang.
  const attachedThumb =
    attached.find((a) => mediaIds.includes(a.id) && a.driveFileId)?.driveFileId ?? null;
  const safeSlideIdx = Math.min(previewSlide, Math.max(0, slides.length - 1));
  const previewFile =
    contentType === "reels"
      ? (videoFile ?? coverFile)
      : contentType === "carousel"
        ? (slideFiles[slides[safeSlideIdx]?.id] ?? null)
        : mediaFile;
  const previewAspect = contentType === "reels" ? "aspect-[9/16]" : "aspect-square";
  // Feed: kotak ngikut rasio file. Carousel: patokan slide 1 (ada file),
  // slide lain cover/zoom mengisi kotak. Dijepit 4:5–1.91:1.
  const ratioSource =
    contentType === "feed"
      ? mediaFile
      : contentType === "carousel" && slides.length > 0
        ? (slideFiles[slides[0].id] ??
          slides.map((s) => slideFiles[s.id]).find((f): f is File => !!f) ??
          null)
        : null;
  const mediaRatio = useMediaRatio(ratioSource);

  return (
    <div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* Form flat ala analytics — tanpa Card */}
        <div className="min-w-0 lg:col-span-2">
          {!scheduleFlow && (
          <div>
            <span className={label}>Tipe konten</span>
            <Segmented
              ariaLabel="Tipe konten"
              value={contentType}
              onChange={(v) => {
                setContentType(v);
                setErrors({});
              }}
              options={typeOptions}
            />
          </div>
          )}
          {modeSelect && !compact && (
            <Segmented
              ariaLabel="Tujuan simpan"
              value={target}
              onChange={(v) => {
                setTarget(v);
                setErrors({});
              }}
              options={[
                { value: "bank", label: "Stok" },
                { value: "schedule", label: "Jadwalkan" },
              ]}
              className="grid w-full grid-cols-2 gap-1"
            />
          )}
          {!compact && (
          <div>
            <label className={label} htmlFor="title">Title *</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={cn(input, errors.title && inputError)}
              placeholder="cth. Panen Raya Hortikultura Kukar"
            />
            {errors.title && <p className={errText}>{errors.title}</p>}
          </div>
          )}

          <section className={scheduleFlow ? "" : section}>
          {/* Type-specific media */}
          {contentType === "feed" && (
            <div>
              <span className={label}>Media</span>
              <div className="flex items-center gap-2 rounded-lg border-2 border-zinc-200 p-2 dark:border-zinc-800">
                {mediaFile ? (
                  <LocalThumb file={mediaFile} />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-400 dark:bg-zinc-900">
                    <ImagePlus className="h-4 w-4" />
                  </span>
                )}
                <label
                  className={cn("min-w-0 flex-1 cursor-pointer truncate rounded-md bg-transparent px-3 py-2 text-xs hover:bg-zinc-100 dark:bg-transparent dark:hover:bg-zinc-800", feedDrag && "bg-brand-50 ring-1 ring-inset ring-brand-500 dark:bg-brand-950")}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!uploading) setFeedDrag(true);
                  }}
                  onDragLeave={() => setFeedDrag(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setFeedDrag(false);
                    if (uploading) return;
                    const f = droppedFile(e, "image/*,video/*");
                    if (f) pickMediaFile(f);
                  }}
                >
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) pickMediaFile(f);
                    }}
                  />
                  <span className="block truncate">{mediaName || "Pilih media…"}</span>
                </label>
                <button aria-label="Pilih dari library" title="Pilih dari library" onClick={() => setPickerFor("media")} className="shrink-0 rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                  <FolderOpen className="h-4 w-4" />
                </button>
                {(mediaFile || mediaName) && (
                  <button
                    aria-label="Hapus pilihan media"
                    onClick={() => {
                      setMediaFile(null);
                      setMediaName("");
                    }}
                    className="shrink-0 rounded p-1 text-zinc-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {contentType === "reels" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex min-w-0 flex-col">
                <span className={label}>Video</span>
<Dropzone label="Upload video" fileName={videoName} file={videoFile} accept="video/*" disabled={uploading} onPick={(f) => { setVideoFile(f); setVideoName(f.name); setPickedThumb(null); }} onClear={() => { setVideoFile(null); setVideoName(""); }} />
                </div>
              <div className="flex min-w-0 flex-col">
                <span className={label}>Cover</span>
<Dropzone label="Upload cover" fileName={coverName} file={coverFile} accept="image/*" disabled={uploading} onPick={(f) => { setCoverFile(f); setCoverName(f.name); setPickedThumb(null); }} onClear={() => { setCoverFile(null); setCoverName(""); }} />
                </div>
            </div>
          )}
          {errors.media && <p className={errText}>{errors.media}</p>}
          {mediaIds.length > 0 && (
            <p className="text-xs text-brand-700 dark:text-brand-400">
              {mediaIds.length} aset library terpilih — tersimpan sebagai relasi saat Save (mode Supabase).
            </p>
          )}
          {attached.filter((a) => mediaIds.includes(a.id)).length > 0 && (
            <div className="space-y-1.5">
              {attached
                .filter((a) => mediaIds.includes(a.id))
                .map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-lg border-2 border-zinc-200 p-1.5 text-xs dark:border-zinc-800"
                  >
                    {a.driveFileId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl(a.driveFileId)}
                        alt=""
                        loading="lazy"
                        className="h-10 w-10 shrink-0 rounded-md object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-800">
                        <ImagePlus className="h-4 w-4 text-zinc-400" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">{a.name}</span>
                    <button
                      type="button"
                      aria-label={`Lepas ${a.name}`}
                      onClick={() => {
                        setMediaIds((prev) => prev.filter((x) => x !== a.id));
                        setAttached((prev) => prev.filter((x) => x.id !== a.id));
                      }}
                      className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
            </div>
          )}

          {contentType === "carousel" && (
            <div>
              <span className={label}>Slides (min. 2) — {filledSlides}/{slides.length} terisi</span>
              <div className="space-y-2">
                {slides.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border-2 border-zinc-200 p-2 dark:border-zinc-800">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sky-100 to-indigo-50 text-xs font-bold text-zinc-500 dark:from-sky-950 dark:to-zinc-900">
                      {i + 1}
                    </span>
                    {slideFiles[s.id] && <LocalThumb file={slideFiles[s.id]} />}
                    <label
                      className={cn("min-w-0 flex-1 cursor-pointer truncate rounded-md bg-transparent px-3 py-2 text-xs hover:bg-zinc-100 dark:bg-transparent dark:hover:bg-zinc-800", dropSlide === s.id && "bg-brand-50 ring-1 ring-inset ring-brand-500 dark:bg-brand-950")}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!uploading) setDropSlide(s.id);
                      }}
                      onDragLeave={() => setDropSlide(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropSlide(null);
                        if (uploading) return;
                        const f = droppedFile(e, "image/*,video/*");
                        if (f) pickSlideFile(s.id, f);
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) pickSlideFile(s.id, f);
                        }}
                      />
                      <span className="block truncate">
                        {s.name || `Pilih media slide ${i + 1}…`}
                      </span>
                    </label>
                    <div className="flex shrink-0">
                      <button aria-label={`Pilih dari library untuk slide ${i + 1}`} title="Pilih dari library" onClick={() => setPickerFor(s.id)} className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <FolderOpen className="h-4 w-4" />
                      </button>
                      <button aria-label="Move slide up" onClick={() => moveSlide(s.id, -1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button aria-label="Move slide down" onClick={() => moveSlide(s.id, 1)} className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <ChevronDown className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Remove slide ${i + 1}`}
                        onClick={() => {
                          setSlides((prev) => prev.filter((p) => p.id !== s.id));
                          setSlideFiles((prev) => {
                            const next = { ...prev };
                            delete next[s.id];
                            return next;
                          });
                        }}
                        className="rounded p-1 text-zinc-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {errors.slides && <p className={errText}>{errors.slides}</p>}
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setSlides((prev) => [...prev, { id: slideId.current++, name: "" }])}
              >
                <Plus className="h-3.5 w-3.5" /> Add slide
              </Button>
            </div>
          )}

          </section>

          <section className={section}>
          <div>
            <label className={label} htmlFor="caption">
              {"Caption *"}
            </label>
            <textarea
              id="caption"
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className={cn(input, errors.caption && inputError)}
              placeholder={compact ? "Tulis caption + hashtag siap posting…" : "Tulis caption siap posting, termasuk CTA…"}
            />
            {errors.caption && <p className={errText}>{errors.caption}</p>}
          </div>

          {!compact && (
          <div>
            <label className={label} htmlFor="hashtag">Hashtag</label>
            <input
              id="hashtag"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              className={input}
              placeholder="#kawaku #kaltim #umkm"
            />
          </div>
          )}

          </section>

          {!compact && (
          <section className={section}>
          <div>
            <span className={label}>PIC</span>
            <div className="flex flex-wrap gap-1.5">
              {picOptions.map((n) => {
                const on = pics.includes(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => togglePic(n)}
                    aria-pressed={on}
                    className={
                      on
                        ? "rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:border-white dark:bg-white dark:text-zinc-900"
                        : "rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            {errors.pic && <p className={errText}>{errors.pic}</p>}
          </div>
          </section>
          )}

          {(!modeSelect || target === "schedule") && (
          <section className={section}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label} htmlFor="date">Schedule date *</label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={cn(input, errors.date && inputError)}
                />
                {errors.date && <p className={errText}>{errors.date}</p>}
              </div>
              <div>
                <label className={label} htmlFor="time">Schedule time *</label>
                <input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={cn(input, errors.time && inputError)}
                />
                {errors.time && <p className={errText}>{errors.time}</p>}
              </div>
            </div>
          </section>
          )}

          {!compact && (
          <section className={section}>
          <div>
            <label className={label} htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={input}
                placeholder="Catatan internal tim…"
            />
          </div>
          </section>
          )}

          <section className={section}>
          {uploadError && (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
              {uploadError}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-end pt-1">
            {uploading && (
              <span className="mr-auto text-xs font-medium text-brand-700 dark:text-brand-400">
                Mengupload ke Drive…
              </span>
            )}
            {onCancel ? (
              <button type="button" onClick={onCancel} className={pillGlass} aria-disabled={uploading}>
                Cancel
              </button>
            ) : (
              <Link href={cancelHref} className={pillGlass} aria-disabled={uploading}>
                Cancel
              </Link>
            )}
            {compact ? (
              <>
                {!scheduleFlow && (
                  <button type="button" disabled={uploading} onClick={() => void handleSave("bank")} className={cn(pillGlass, "ml-2")}>
                    Simpan ke Stok
                  </button>
                )}
                {/* Selalu tampil: lapisan putih fade in/out di atas abu saat siap/belum */}
                <button
                  type="button"
                  disabled={!canSchedule || uploading}
                  onClick={() => void handleSave("submit")}
                  className={cn(pillGlass, "group relative ml-2")}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.15)] transition-opacity duration-300 group-hover:bg-zinc-100",
                      canSchedule ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className={cn("relative transition-colors duration-300", canSchedule && "text-zinc-900 dark:text-zinc-900")}>
                    {submitLabel}
                  </span>
                </button>
              </>
            ) : modeSelect ? (
              target === "bank" ? (
                <button type="button" disabled={uploading} onClick={() => void handleSave("bank")} className={cn(pillGlass, "ml-2")}>
                  Simpan ke Stok
                </button>
              ) : (
                <button type="button" disabled={uploading} onClick={() => void handleSave("submit")} className={cn(pillWhite, "ml-2")}>{submitLabel}</button>
              )
            ) : (
              <button type="button" disabled={uploading} onClick={() => void handleSave("submit")} className={cn(pillWhite, "ml-2")}>{submitLabel}</button>
            )}
          </div>
          </section>
        </div>

        {/* Preview — langsung mockup HP, tanpa card ganda */}
        <div className="h-fit overflow-hidden rounded-xl bg-transparent lg:sticky lg:top-20">
          {contentType === "reels" ? (
            /* Reels ala IG: video full sekartu, profil + caption numpang di atas video */
            <div className="relative aspect-[9/16] overflow-hidden bg-black text-white">
              {previewFile || pickedThumb || attachedThumb ? (
                <PreviewMedia file={previewFile} driveFileId={pickedThumb ?? attachedThumb} aspect="absolute inset-0" autoPlay />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-zinc-400">
                  {videoName || coverName
                    ? `Video: ${videoName || "—"} • Cover: ${coverName || "—"}`
                    : "Video preview muncul di sini"}
                </span>
              )}
              <div className="absolute inset-x-0 top-0 bg-transparent px-3 py-2.5 drop-shadow">
                <div className="flex items-center gap-2">
                  <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/30 bg-white">
                    <Image src="/kawaku-avatar.jpg" alt="kawaku.kukar" width={64} height={64} className="h-full w-full object-contain" />
                  </span>
                  <div className="leading-tight">
                    <p className="text-xs font-semibold text-white">kawaku.kukar</p>
                    <p className="text-[11px] text-white/70">Original audio</p>
                  </div>
                </div>
              </div>
              <div className="absolute inset-x-0 bottom-0 space-y-1 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-6">
                <p className="line-clamp-3 whitespace-pre-line text-xs">
                  {caption || "Caption preview muncul di sini…"}
                </p>
                <p className="text-[11px] text-white/70">
                  {date ? fmtPreviewDate(date) : "—"}
                </p>
              </div>
            </div>
          ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950">
                <Image src="/kawaku-avatar.jpg" alt="kawaku.kukar" width={64} height={64} className="h-full w-full object-contain" />
              </span>
              <div className="leading-tight">
                <p className="text-xs font-semibold">kawaku.kukar</p>
                <p className="text-[11px] text-zinc-500">Original audio</p>
              </div>
            </div>
            <div
              style={mediaRatio ? { aspectRatio: String(mediaRatio) } : undefined}
              className={cn(
                "relative flex items-center justify-center overflow-hidden bg-black text-zinc-400",
                !mediaRatio && previewAspect
              )}
            >
              {previewFile || pickedThumb || attachedThumb || contentType === "carousel" ? (
                <>
                  <PreviewMedia file={previewFile} driveFileId={pickedThumb ?? attachedThumb} aspect="absolute inset-0" autoPlay />
                  {contentType === "carousel" && !previewFile && !(pickedThumb ?? attachedThumb) && (
                    <span className="px-4 text-center text-xs">
                      Slide {safeSlideIdx + 1}/{slides.length}
                      {slides[safeSlideIdx]?.name ? ` — ${slides[safeSlideIdx].name}` : ""}
                    </span>
                  )}
                  {contentType === "carousel" && slides.length > 1 && (
                    <>
                      {safeSlideIdx > 0 && (
                        <button
                          type="button"
                          aria-label="Slide sebelumnya"
                          onClick={() => setPreviewSlide((i) => Math.max(0, i - 1))}
                          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                      )}
                      {safeSlideIdx < slides.length - 1 && (
                        <button
                          type="button"
                          aria-label="Slide berikutnya"
                          onClick={() => setPreviewSlide((i) => Math.min(slides.length - 1, i + 1))}
                          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                      <span className="absolute bottom-2 right-2 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {safeSlideIdx + 1}/{slides.length}
                      </span>
                    </>
                  )}
                </>
              ) : (
              <span className="px-4 text-center text-xs">
                {mediaName || "Media preview muncul di sini"}
              </span>
              )}
            </div>
            <div className="space-y-1.5 px-3 py-3">
              <p className="line-clamp-3 whitespace-pre-line text-xs text-zinc-600 dark:text-zinc-300">
                {caption || "Caption preview muncul di sini…"}
              </p>
              {hashtags.trim() && (
                <p className="truncate text-xs text-sky-600 dark:text-sky-400">{hashtags}</p>
              )}
              <p className="pt-1 text-[11px] text-zinc-500">
                {date ? fmtPreviewDate(date) : "—"}
                {notes.trim() && ` • Note: ${notes.trim()}`}
              </p>
            </div>
          </>
          )}
        </div>
      </div>

      <MediaPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={pickAsset}
      />
    </div>
  );
}
