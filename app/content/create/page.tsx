"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ContentForm, valuesToPatch, type ContentFormValues, type SaveMode } from "@/components/content-form";
import { createContent, setContentMedia, usesSupabase } from "@/lib/content-db";
import { markSaved } from "@/lib/content-store";

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
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: ContentFormValues, mode: SaveMode) {
    setError(null);
    if (!usesSupabase()) {
      setSaved(
        mode === "bank"
          ? `"${values.title.trim()}" masuk Bank (mock) — siap dijadwalkan kapan saja.`
          : mode === "draft"
            ? `Draft "${values.title.trim()}" tersimpan (mock) — siap dilanjutkan ke backend.`
            : `"${values.title.trim()}" dijadwalkan (mock) — otomatis published saat waktunya tiba.`
      );
      return;
    }
    try {
      const patch = valuesToPatch(values);
      const id = await createContent({
        title: patch.title ?? values.title.trim(),
        type: values.type,
        status: mode === "submit" ? "scheduled" : mode === "bank" ? "idea" : "draft",
        scheduledDate: values.date,
        scheduledTime: values.time,
        pic: patch.pic ?? values.pics.join(", "),
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
      } catch {
        // relasi gagal tidak menggagalkan pembuatan konten
      }
      router.push(`/content/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membuat konten.");
    }
  }

  return (
    <div>
      <PageHeader
        title="Create Content"
        description="Pilih type dulu — form dan preview menyesuaikan otomatis."
        action={
          <Link href="/content">
            <Button variant="outline" size="sm">Back to Content</Button>
          </Link>
        }
      />

      {saved && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {saved}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {error}
        </p>
      )}

      <ContentForm
        cancelHref="/content"
        submitLabel="Jadwalkan"
        allowBank
        onSubmit={handleSubmit}
      />
    </div>
  );
}
