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
import type { ContentStatus, ManagedContent } from "@/lib/mock";

// Modal lengkapi-lalu-pindah utk drop board ke Stok/Scheduled.
// Isinya ContentForm compact (gaya create) agar field yg belum lengkap bisa diisi.
// Tujuan scheduled = ada tanggal/jam; tujuan stok (idea) = tanpa tanggal/jam.
// Selalu ter-mount saat ada content (demi animasi keluar); form di-reset tiap tutup.
// Klik Simpan langsung tutup modal — proses jalan di background, loadingnya
// hanya denyut kartu di kolom target (via onSubmitting → board).
export function ScheduleModal({
  open,
  content,
  to = "scheduled",
  onClose,
  onSubmitting,
  onScheduled,
  onSubmitError,
  onExitComplete,
}: {
  open: boolean;
  content: ManagedContent | null;
  to?: "scheduled" | "idea";
  onClose: () => void;
  onSubmitting?: (content: ManagedContent, to: "scheduled" | "idea") => void;
  onScheduled: (title: string, from: ContentStatus, to: "scheduled" | "idea") => void;
  onSubmitError?: (msg: string, from: ContentStatus, to: "scheduled" | "idea") => void;
  onExitComplete?: () => void;
}) {
  const [cycle, setCycle] = useState(0);
  const toStok = to === "idea";

  async function handleSubmit(values: ContentFormValues) {
    if (!content) return;
    const c = content;
    const patch = valuesToPatch(values);
    const mediaIds = values.mediaIds;
    const title = values.title.trim() || c.title;
    onSubmitting?.(c, to);
    onClose();
    try {
      await saveContent(c.id, patch);
      try {
        await setContentMedia(c.id, mediaIds);
      } catch (e) {
        markMediaWarning(`Perubahan tersimpan, tapi relasi media gagal: ${e instanceof Error ? e.message : "unknown"}.`);
      }
      await changeStatus(c.id, to);
      markSaved(c.id);
      onScheduled(title, c.status, to);
    } catch (e) {
      onSubmitError?.(
        e instanceof Error ? e.message : toStok ? "Gagal menyimpan ke Stok." : "Gagal menjadwalkan.",
        c.status,
        to
      );
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
      onSubmit={(v) => void handleSubmit(v)}
    />
  );
}
