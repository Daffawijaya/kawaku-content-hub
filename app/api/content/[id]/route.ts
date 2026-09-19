import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/drive/guard";
import { trashOrphanAssets } from "@/lib/drive/cleanup";
import { deleteMedia } from "@/lib/instagram/client";
import { createClient } from "@/lib/supabase/server";

// Hapus total (admin): postingan IG dulu (bila tertaut — gagal = batal
// semua, data lokal utuh), baru baris konten → relasi media → aset yatim
// (baris DB + file Drive di-trash). Aset yang masih dipakai konten
// lain hanya dilepas relasinya, tidak dihapus.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: contentRow } = await supabase
    .from("contents")
    .select("ig_media_id")
    .eq("id", id)
    .single();
  const igMediaId = (contentRow as { ig_media_id?: string | null } | null)?.ig_media_id;
  // Urutan ketat: postingan IG harus terhapus dulu. Gagal = batal semua,
  // data lokal utuh.
  if (igMediaId) {
    try {
      await deleteMedia(igMediaId);
    } catch (e) {
      return NextResponse.json(
        { error: `Hapus dari IG gagal, data lokal tidak dihapus: ${e instanceof Error ? e.message : "unknown"}.` },
        { status: 500 }
      );
    }
  }
  const { data: rel } = await supabase
    .from("content_media")
    .select("media_id")
    .eq("content_id", id);
  const mediaIds = ((rel ?? []) as { media_id: string }[]).map((r) => r.media_id);

  const { error: contentError } = await supabase.from("contents").delete().eq("id", id);
  if (contentError) {
    return NextResponse.json({ error: `Hapus konten gagal: ${contentError.message}` }, { status: 500 });
  }
  await supabase.from("content_media").delete().eq("content_id", id);
  const warnings = await trashOrphanAssets(mediaIds);
  return NextResponse.json({ ok: true, ...(warnings.length > 0 ? { warnings } : {}) });
}
