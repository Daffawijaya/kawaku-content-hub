"use client";

import { useState } from "react";
import { ContentForm, type ContentFormValues, type SaveMode } from "@/components/content-form";
import { createContent, setContentMedia } from "@/lib/content-db";
import { markMediaWarning, markSaved } from "@/lib/ui-flags";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Modal create (isi persis /content/create versi compact).
// Selalu ter-mount; form di-reset tiap selesai animasi tutup.
export function CreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);

  async function handleSubmit(values: ContentFormValues, mode: SaveMode) {
    setError(null);
    try {
      const id = await createContent({
        title: values.title.trim(),
        type: values.type,
        status: mode === "submit" ? "scheduled" : "idea",
        scheduledDate: values.date || null,
        scheduledTime: values.time || null,
        pic: values.pics.join(", "),
        initials: values.pics.map(initialsOf).join(", "),
        caption: values.caption,
        hashtags: values.hashtags,
        category: values.category,
        notes: values.notes,
        slides: values.type === "carousel" ? values.slides.length : undefined,
      });
      markSaved(id);
      try {
        await setContentMedia(id, values.mediaIds);
      } catch (e) {
        markMediaWarning(`Konten tersimpan, tapi relasi media gagal: ${e instanceof Error ? e.message : "unknown"}.`);
      }
      onCreated(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat konten.");
    }
  }

  return (
    <ContentForm
      key={cycle}
      layout="modal"
      modalOpen={open}
      modalTitle="Create Content"
      modalOnClose={onClose}
      modalOnExitComplete={() => {
        setCycle((c) => c + 1);
        setError(null);
      }}
      cancelHref="/content"
      onCancel={onClose}
      submitLabel="Jadwalkan"
      compact
      alert={
        error ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
            {error}
          </p>
        ) : null
      }
      onSubmit={(v, m) => void handleSubmit(v, m)}
    />
  );
}
