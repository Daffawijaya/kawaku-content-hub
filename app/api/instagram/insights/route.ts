import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { getMediaInsights } from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/instagram/insights?ids=a,b,c: metrik real per postingan IG.
// Maks 20 id per panggilan; id yg gagal dilewati (tidak menggagalkan semua).
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
  const metrics: Record<string, NonNullable<Awaited<ReturnType<typeof getMediaInsights>>>> = {};
  await Promise.all(
    ids.map(async (id) => {
      const m = await getMediaInsights(id);
      if (m) metrics[id] = m;
    })
  );
  return NextResponse.json({ ok: true, metrics });
}
