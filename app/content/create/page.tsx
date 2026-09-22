"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ContentForm, valuesToPatch, type ContentFormValues, type SaveMode } from "@/components/content-form";
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

export default function CreateContentPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: ContentFormValues, mode: SaveMode) {
    setError(null);
    try {
      const patch = valuesToPatch(values);
      const id = await createContent({
        title: patch.title ?? values.title.trim(),
        type: values.type,
        status: mode === "submit" ? "scheduled" : mode === "bank" ? "idea" : "draft",
        scheduledDate: values.date || null,
        scheduledTime: values.time || null,
        pic: patch.pic ?? values.pics.join(", "),
        initials: values.pics.map(initialsOf).join(", "),
        caption: values.caption,
        hashtags: values.hashtags,
        category: values.category,
        notes: values.notes,
        slides: values.type === "carousel" ? values.slides.length : undefined,
        igUserTags: values.userTags,
        igLocationId: values.locationId.trim() || null,
        igLocationName: values.locationName.trim() || null,
        igAltText: values.altText.trim(),
      });
      markSaved(id);
      try {
        await setContentMedia(id, values.mediaIds);
      } catch (e) {
        markMediaWarning(`Konten tersimpan, tapi relasi media gagal: ${e instanceof Error ? e.message : "unknown"}.`);
      }
      router.push(`/content/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat konten.");
    }
  }

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader title="Buat Konten" />

      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </p>
      )}

      <ContentForm
        cancelHref="/content"
        submitLabel="Jadwalkan"
        compact
        onSubmit={handleSubmit}
      />
    </div>
  );
}
