"use client";

import { useState } from "react";
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
// Isinya ContentForm compact (gaya create) agar field yg belum lengkap bisa diisi.
// Selalu ter-mount saat ada content (demi animasi keluar); form di-reset tiap tutup.
export function ScheduleModal({
  open,
  content,
  onClose,
  onScheduled,
  onExitComplete,
}: {
  open: boolean;
  content: ManagedContent | null;
  onClose: () => void;
  onScheduled: (title: string) => void;
  onExitComplete?: () => void;
}) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);

  async function handleSubmit(values: ContentFormValues) {
    if (!content) return;
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

  if (!content) return null;
  return (
    <ContentForm
      key={`${content.id}-${content.updatedAt}-${cycle}`}
      layout="modal"
      modalOpen={open}
      modalTitle="Jadwalkan konten"
      modalSubtitle={`Lengkapi “${content.title}” lalu jadwalkan.`}
      modalOnClose={onClose}
      modalOnExitComplete={() => {
        setCycle((c) => c + 1);
        setSaveError(null);
        onExitComplete?.();
      }}
      initial={valuesFromContent(content)}
      cancelHref={`/content/${content.id}`}
      onCancel={onClose}
      submitLabel="Jadwalkan"
      compact
      scheduleFlow
      contentId={content.id}
      alert={
        saveError ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {saveError}
          </p>
        ) : null
      }
      onSubmit={(v) => void handleSubmit(v)}
    />
  );
}
