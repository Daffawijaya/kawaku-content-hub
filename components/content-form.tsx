"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  FolderOpen,
  ImagePlus,
  Images,
  LayoutGrid,
  Plus,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { MediaPicker, type PickerAsset } from "@/components/media-picker";
import { TypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  categories,
  teamNames,
  typeMeta,
  type ContentType,
  type ManagedContent,
} from "@/lib/mock";

const typeCards: { value: ContentType; desc: string; icon: typeof LayoutGrid }[] = [
  { value: "feed", desc: "Single image post", icon: LayoutGrid },
  { value: "carousel", desc: "Multi-slide, min. 2", icon: Images },
  { value: "reels", desc: "Vertical video + cover", icon: Clapperboard },
  { value: "story", desc: "24h vertical media", icon: Smartphone },
];

const input =
  "w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-brand-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100";
const inputError = "border-rose-400 focus:border-rose-500";
const label = "mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300";
const errText = "mt-1 text-xs text-rose-600 dark:text-rose-400";

export type SlideValue = { id: number; name: string };

export type ContentFormValues = {
  type: ContentType;
  title: string;
  caption: string;
  hashtags: string;
  category: string;
  pic: string;
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
  pic: teamNames[0],
  date: "2026-09-15",
  time: "09:00",
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
    pic: c.pic,
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

// Patch siap simpan ke store/backend
export function valuesToPatch(v: ContentFormValues): Partial<ManagedContent> {
  return {
    type: v.type,
    title: v.title.trim(),
    caption: v.caption,
    hashtags: v.hashtags,
    category: v.category,
    pic: v.pic,
    scheduledDate: v.date,
    scheduledTime: v.time,
    notes: v.notes,
    ...(v.type === "carousel" ? { slides: v.slides.length } : {}),
  };
}

function LibraryButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
    >
      <FolderOpen className="h-3.5 w-3.5" /> atau pilih dari Media Library
    </button>
  );
}

function Dropzone({
  label,
  fileName,
  accept,
  onPick,
  hint,
}: {
  label: string;
  fileName: string;
  accept: string;
  onPick: (name: string) => void;
  hint: string;
}) {
  return (
    <label className="block cursor-pointer rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center transition-colors hover:border-brand-500 hover:bg-brand-50/50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-brand-600">
      <input
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f.name);
        }}
      />
      {fileName ? (
        <span className="inline-flex max-w-full items-center gap-2 text-sm font-medium">
          <ImagePlus className="h-4 w-4 shrink-0 text-brand-600" />
          <span className="truncate">{fileName}</span>
        </span>
      ) : (
        <span>
          <Upload className="mx-auto h-5 w-5 text-zinc-400" />
          <span className="mt-2 block text-sm font-medium">{label}</span>
          <span className="mt-0.5 block text-xs text-zinc-500">{hint} — UI saja, tidak diupload</span>
        </span>
      )}
    </label>
  );
}

export function ContentForm({
  initial = {},
  cancelHref,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<ContentFormValues>;
  cancelHref: string;
  submitLabel: string;
  onSubmit: (values: ContentFormValues, mode: "draft" | "submit") => void;
}) {
  const init = { ...emptyFormValues, ...initial };
  const [contentType, setContentType] = useState<ContentType>(init.type);
  const [title, setTitle] = useState(init.title);
  const [caption, setCaption] = useState(init.caption);
  const [hashtags, setHashtags] = useState(init.hashtags);
  const [category, setCategory] = useState(init.category);
  const [pic, setPic] = useState(init.pic);
  const [date, setDate] = useState(init.date);
  const [time, setTime] = useState(init.time);
  const [notes, setNotes] = useState(init.notes);
  const [mediaName, setMediaName] = useState(init.mediaName);
  const [videoName, setVideoName] = useState(init.videoName);
  const [coverName, setCoverName] = useState(init.coverName);
  const [slides, setSlides] = useState<SlideValue[]>(init.slides);
  const [mediaIds, setMediaIds] = useState<string[]>(init.mediaIds);
  const [pickerFor, setPickerFor] = useState<"media" | "video" | "cover" | number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const slideId = useRef(Math.max(...init.slides.map((s) => s.id), 0) + 1);

  function pickAsset(a: PickerAsset) {
    setMediaIds((prev) => (prev.includes(a.id) ? prev : [...prev, a.id]));
    if (pickerFor === "media") setMediaName(a.name);
    else if (pickerFor === "video") setVideoName(a.name);
    else if (pickerFor === "cover") setCoverName(a.name);
    else if (typeof pickerFor === "number")
      setSlides((prev) => prev.map((p) => (p.id === pickerFor ? { ...p, name: a.name } : p)));
  }

  const captionRequired = contentType !== "story";

  function validate(mode: "draft" | "submit") {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title wajib diisi.";
    if (mode === "submit") {
      if (captionRequired && !caption.trim()) e.caption = "Caption wajib diisi.";
      if (!date) e.date = "Tanggal schedule wajib diisi.";
      if (!time) e.time = "Jam schedule wajib diisi.";
      if (contentType === "carousel") {
        if (slides.length < 2) e.slides = "Carousel minimal 2 slide.";
        else if (slides.some((s) => !s.name))
          e.slides = "Semua slide harus punya media (pilih file tiap slide).";
      }
    }
    return e;
  }

  function collect(): ContentFormValues {
    return {
      type: contentType, title, caption, hashtags, category, pic,
      date, time, notes, mediaName, videoName, coverName, slides, mediaIds,
    };
  }

  function handleSave(mode: "draft" | "submit") {
    const e = validate(mode);
    setErrors(e);
    if (Object.keys(e).length > 0) return;
    onSubmit(collect(), mode);
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

  return (
    <div>
      {/* Type picker */}
      <div className="mb-6 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {typeCards.map((t) => {
          const Icon = t.icon;
          const active = contentType === t.value;
          return (
            <button
              key={t.value}
              onClick={() => {
                setContentType(t.value);
                setErrors({});
              }}
              aria-pressed={active}
              className={cn(
                "rounded-xl border p-3.5 text-left transition-colors",
                active
                  ? "border-brand-500 bg-brand-50/60 dark:bg-brand-950/40"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950"
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-zinc-400")} />
              <span className="mt-2 block text-sm font-semibold">{typeMeta[t.value].label}</span>
              <span className="text-xs text-zinc-500">{t.desc}</span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        {/* Form */}
        <Card className="space-y-4 p-5 sm:p-6 lg:col-span-3">
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

          {/* Type-specific media */}
          {contentType === "feed" && (
            <div>
              <span className={label}>Media</span>
              <Dropzone label="Upload foto feed" fileName={mediaName} accept="image/*" onPick={setMediaName} hint="JPG/PNG, rasio 1:1 atau 4:5" />
              <LibraryButton onClick={() => setPickerFor("media")} />
            </div>
          )}

          {contentType === "story" && (
            <div>
              <span className={label}>Media</span>
              <Dropzone label="Upload story" fileName={mediaName} accept="image/*,video/*" onPick={setMediaName} hint="Foto/video vertikal 9:16" />
              <LibraryButton onClick={() => setPickerFor("media")} />
            </div>
          )}

          {contentType === "reels" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className={label}>Video</span>
                <Dropzone label="Upload video" fileName={videoName} accept="video/*" onPick={setVideoName} hint="MP4, vertikal 9:16" />
                <LibraryButton onClick={() => setPickerFor("video")} />
              </div>
              <div>
                <span className={label}>Cover</span>
                <Dropzone label="Upload cover" fileName={coverName} accept="image/*" onPick={setCoverName} hint="Thumbnail feed preview" />
                <LibraryButton onClick={() => setPickerFor("cover")} />
              </div>
            </div>
          )}
          {mediaIds.length > 0 && (
            <p className="text-xs text-brand-700 dark:text-brand-400">
              {mediaIds.length} aset library terpilih — tersimpan sebagai relasi saat Save (mode Supabase).
            </p>
          )}

          {contentType === "carousel" && (
            <div>
              <span className={label}>Slides (min. 2) — {filledSlides}/{slides.length} terisi</span>
              <div className="space-y-2">
                {slides.map((s, i) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sky-100 to-indigo-50 text-xs font-bold text-zinc-500 dark:from-sky-950 dark:to-zinc-900">
                      {i + 1}
                    </span>
                    <label className="min-w-0 flex-1 cursor-pointer truncate rounded-md bg-zinc-50 px-3 py-2 text-xs hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setSlides((prev) => prev.map((p) => (p.id === s.id ? { ...p, name: f.name } : p)));
                        }}
                      />
                      <span className="block truncate">{s.name || `Pilih media slide ${i + 1}…`}</span>
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
                        onClick={() => setSlides((prev) => prev.filter((p) => p.id !== s.id))}
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

          <div>
            <label className={label} htmlFor="caption">
              {contentType === "story" ? "Caption / Text" : "Caption *"}
            </label>
            <textarea
              id="caption"
              rows={4}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className={cn(input, errors.caption && inputError)}
              placeholder="Tulis caption siap posting, termasuk CTA…"
            />
            {errors.caption && <p className={errText}>{errors.caption}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
            <div>
              <label className={label} htmlFor="category">Category</label>
              <select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={input}>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="pic">PIC</label>
            <select id="pic" value={pic} onChange={(e) => setPic(e.target.value)} className={input}>
              {teamNames.map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </div>

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

          <div>
            <label className={label} htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={input}
              placeholder="Catatan internal untuk reviewer…"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Link href={cancelHref}>
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button variant="outline" onClick={() => handleSave("draft")}>
              Save Draft
            </Button>
            <Button onClick={() => handleSave("submit")}>{submitLabel}</Button>
          </div>
        </Card>

        {/* Preview */}
        <Card className="p-5 lg:col-span-2 lg:sticky lg:top-20">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold">Preview</p>
            <TypeBadge type={contentType} />
          </div>
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                K
              </span>
              <div className="leading-tight">
                <p className="text-xs font-semibold">kawaku.hub</p>
                <p className="text-[11px] text-zinc-500">Original audio</p>
              </div>
            </div>
            <div
              className={cn(
                "flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-50 text-zinc-400 dark:from-zinc-800 dark:to-zinc-900",
                contentType === "reels" || contentType === "story" ? "aspect-[9/14]" : "aspect-square"
              )}
            >
              <span className="px-4 text-center text-xs">
                {(contentType === "feed" || contentType === "story") && (mediaName || "Media preview muncul di sini")}
                {contentType === "reels" && (videoName || coverName
                  ? `Video: ${videoName || "—"} • Cover: ${coverName || "—"}`
                  : "Video preview muncul di sini")}
                {contentType === "carousel" && `${filledSlides}/${slides.length} slide terisi`}
              </span>
            </div>
            <div className="space-y-1.5 px-3 py-3">
              <p className="text-sm font-semibold">{title || "Judul konten…"}</p>
              <p className="line-clamp-3 whitespace-pre-line text-xs text-zinc-600 dark:text-zinc-300">
                {caption || "Caption preview muncul di sini…"}
              </p>
              {hashtags.trim() && (
                <p className="truncate text-xs text-sky-600 dark:text-sky-400">{hashtags}</p>
              )}
              <p className="pt-1 text-[11px] text-zinc-500">
                {category} • {pic || "PIC"} • {date || "—"} {time || ""}
                {notes.trim() && ` • Note: ${notes.trim()}`}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <MediaPicker
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        onSelect={pickAsset}
      />
    </div>
  );
}
