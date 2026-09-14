import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/drive/guard";
import { trashOrphanAssets } from "@/lib/drive/cleanup";
import { createClient } from "@/lib/supabase/server";

// Hapus konten (admin): baris konten → relasi media → aset yatim
// (baris DB + file Drive di-trash). Aset yang masih dipakai konten
// lain hanya dilepas relasinya, tidak dihapus.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await ctx.params;

  const supabase = await createClient();
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
