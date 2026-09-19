import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { publishContentById } from "@/lib/instagram/publish";
import { createClient } from "@/lib/supabase/server";

// POST { contentId, imageUrl?, videoUrl?, coverUrl? }: publish konten ke IG.
// Semua tipe (feed/reels/carousel). URL diambil otomatis dari aset Drive
// terhubung (dijadikan publik dulu); override manual via body tetap bisa.
export async function POST(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    contentId?: unknown;
    imageUrl?: unknown;
    videoUrl?: unknown;
    coverUrl?: unknown;
  } | null;
  const contentId = typeof body?.contentId === "string" ? body.contentId : "";
  if (!contentId) {
    return NextResponse.json({ error: "contentId wajib diisi." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const result = await publishContentById(supabase, contentId, {
      imageUrl: typeof body?.imageUrl === "string" ? body.imageUrl : undefined,
      videoUrl: typeof body?.videoUrl === "string" ? body.videoUrl : undefined,
      coverUrl: typeof body?.coverUrl === "string" ? body.coverUrl : undefined,
    });
    return NextResponse.json({
      ok: true,
      igMediaId: result.igMediaId,
      permalink: result.permalink,
      ...(result.driveWarnings.length > 0 ? { warnings: result.driveWarnings } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Publish IG gagal.";
    const status = (e as Error & { status?: number }).status ?? (/tidak ditemukan/.test(msg) ? 404 : 500);
    return NextResponse.json({ error: msg }, { status });
  }
}
