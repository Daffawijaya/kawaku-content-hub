import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import {
  getMediaInsights,
  getMediaPreview,
} from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/instagram/insights?ids=a,b,c: metrik + preview real per postingan IG
// milik sendiri. Maks 20 id per panggilan; id yg gagal dilewati.
type IgInsightShape = NonNullable<Awaited<ReturnType<typeof getMediaInsights>>>;

export async function GET(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, metrics: {}, previews: {}, collabIds: [] });
  }
  // preview=1: cek keberadaan/arsip saja (kalender) — tanpa metrik, separuh request Graph.
  const previewOnly = new URL(req.url).searchParams.get("preview") === "1";

  const metrics: Record<string, IgInsightShape> = {};
  const previews: Record<string, NonNullable<Awaited<ReturnType<typeof getMediaPreview>>>> = {};

  await Promise.all(
    ids.map(async (id) => {
      if (previewOnly) {
        const p = await getMediaPreview(id);
        if (p) previews[id] = p;
        return;
      }
      const [m, p] = await Promise.all([getMediaInsights(id), getMediaPreview(id)]);
      if (m) metrics[id] = m;
      if (p) previews[id] = p;
    })
  );
  return NextResponse.json({ ok: true, metrics, previews, collabIds: [] });
}
