"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  ContentForm,
  valuesFromContent,
  valuesToPatch,
  type ContentFormValues,
} from "@/components/content-form";
import {
  getContent,
  saveContent,
  setContentMedia,
  type ContentDetail,
} from "@/lib/content-db";
import { markMediaWarning, markSaved } from "@/lib/ui-flags";

export default function EditContentPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<ContentDetail | null | undefined>(undefined);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getContent(id)
      .then((d) => setDetail(d ?? null))
      .catch(() => setDetail(null));
  }, [id]);

  if (detail === undefined) {
    return <p className="py-12 text-center text-sm text-zinc-500">Memuat form edit…</p>;
  }

  if (detail === null) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <p className="text-base font-semibold">Konten tidak ditemukan</p>
        <Link href="/content" className="mt-4 inline-block">
          <Button variant="outline" size="sm">Kembali ke Content</Button>
        </Link>
      </div>
    );
  }

  async function handleSubmit(values: ContentFormValues) {
    setSaveError(null);
    setSaving(true);
    try {
      await saveContent(id, valuesToPatch(values));
      try {
        await setContentMedia(id, values.mediaIds);
      } catch (e) {
        markMediaWarning(`Perubahan tersimpan, tapi relasi media gagal: ${e instanceof Error ? e.message : "unknown"}.`);
      }
      markSaved(id);
      router.push(`/content/${id}`);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Gagal menyimpan.");
      setSaving(false);
    }
  }

  return (
    <div>
      <Link
        href={`/content/${id}`}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Detail
      </Link>
      <PageHeader
        title="Edit Content"
        description={`Mengubah “${detail.title}”.`}
      />
      {saveError && (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          {saveError}
        </p>
      )}
      {saving && (
        <p className="mb-4 text-sm text-zinc-500">Menyimpan perubahan…</p>
      )}
      <ContentForm
        key={detail.id + detail.updatedAt}
        initial={valuesFromContent(detail)}
        cancelHref={`/content/${id}`}
        submitLabel="Save Changes"
        contentId={detail.id}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
