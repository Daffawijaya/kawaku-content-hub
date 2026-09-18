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

// Modal lengkapi-lalu-pindah utk drop board ke Stok/Scheduled.
// Isinya ContentForm compact (gaya create) agar field yg belum lengkap bisa diisi.
// Tujuan scheduled = ada tanggal/jam; tujuan stok (idea) = tanpa tanggal/jam.
// Selalu ter-mount saat ada content (demi animasi keluar); form di-reset tiap tutup.
export function ScheduleModal({
  open,
  content,
  to = "scheduled",
  onClose,
  onScheduled,
  onExitComplete,
}: {
  open: boolean;
  content: ManagedContent | null;
  to?: "scheduled" | "idea";
  onClose: () => void;
  onScheduled: (title: string) => void;
  onExitComplete?: () => void;
}) {
  const [saveError, setSaveError] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);
  const toStok = to === "idea";

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
      await changeStatus(content.id, to);
      markSaved(content.id);
      onScheduled(values.title.trim() || content.title);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : toStok ? "Gagal menyimpan ke Stok." : "Gagal menjadwalkan.");
    }
  }

  if (!content) return null;
  // Tanpa subjudul: judulnya yang berbunyi Lengkapi "X". Caption kosong
  // tersimpan sebagai "Tanpa judul" — tampilkan sebagai "konten" saja.
  const t = content.title.trim();
  const label = t && t !== "Tanpa judul" ? `“${content.title}”` : "konten";
  return (
    <ContentForm
      key={`${content.id}-${content.updatedAt}-${cycle}-${to}`}
      layout="modal"
      modalOpen={open}
      modalTitle={`Lengkapi ${label}`}
      modalOnClose={onClose}
      modalOnExitComplete={() => {
        setCycle((c) => c + 1);
        setSaveError(null);
        onExitComplete?.();
      }}
      initial={valuesFromContent(content)}
      cancelHref={`/content/${content.id}`}
      onCancel={onClose}
      submitLabel={toStok ? "Simpan" : "Jadwalkan"}
      compact
      scheduleFlow
      hideSchedule={toStok}
      submitMode={toStok ? "stok" : "submit"}
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
