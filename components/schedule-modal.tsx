"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  ContentForm,
  valuesFromContent,
  valuesToPatch,
  type ContentFormValues,
} from "@/components/content-form";
import {
  changeStatus,
  saveContent,
  setContentMedia,
} from "@/lib/content-db";
import { markMediaWarning, markSaved } from "@/lib/ui-flags";
import type { ManagedContent } from "@/lib/mock";

// Modal lengkapi-lalu-jadwalkan utk stok yg di-drop ke kolom Scheduled.
// Isinya ContentForm full (gaya create) agar field yg belum lengkap bisa diisi.
export function ScheduleModal({
  content,
  onClose,
  onScheduled,
}: {
  content: ManagedContent;
  onClose: () => void;
  onScheduled: (title: string) => void;
}) {
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(values: ContentFormValues) {
    setSaveError(null);
    try {
      await saveContent(content.id, valuesToPatch(values));
      try {
        await setContentMedia(content.id, values.mediaIds);
      } catch (e) {
        markMediaWarning(`Perubahan tersimpan, tapi relasi media gagal: ${e instanceof Error ? e.message : "unknown"}.`);
      }
      await changeStatus(content.id, "scheduled");
      markSaved(content.id);
      onScheduled(values.title.trim() || content.title);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Gagal menjadwalkan.");
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Jadwalkan ${content.title}`}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl sm:p-6 dark:bg-zinc-950">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Jadwalkan konten</h2>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              Lengkapi “{content.title}” lalu jadwalkan.
            </p>
          </div>
          <button
            type="button"
            aria-label="Tutup"
            onClick={onClose}
            className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {saveError && (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {saveError}
          </p>
        )}
        <ContentForm
          key={content.id + content.updatedAt}
          initial={valuesFromContent(content)}
          cancelHref={`/content/${content.id}`}
          onCancel={onClose}
          submitLabel="Jadwalkan"
          compact
          scheduleFlow
          contentId={content.id}
          onSubmit={(v) => void handleSubmit(v)}
        />
      </div>
    </div>
  );
}
