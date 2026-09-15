import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/drive/guard";
import { isInstagramConfigured } from "@/lib/instagram/config";
import { deleteMedia } from "@/lib/instagram/client";
import { createClient } from "@/lib/supabase/server";

// Hapus postingan IG + lepas tautan di konten lokal (admin, samakan dengan hapus konten).
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  const { id } = await ctx.params;

  try {
    await deleteMedia(id);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Hapus dari IG gagal." },
      { status: 500 }
    );
  }
  const supabase = await createClient();
  await supabase
    .from("contents")
    .update({ ig_media_id: null, published_url: null, ig_sync_error: null })
    .eq("ig_media_id", id);
  return NextResponse.json({ ok: true });
}
