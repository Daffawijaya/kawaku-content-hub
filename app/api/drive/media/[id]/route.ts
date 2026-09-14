import { NextResponse } from "next/server";
import { trashDriveFile } from "@/lib/drive/client";
import { requireEditor } from "@/lib/drive/guard";
import { createClient } from "@/lib/supabase/server";

// Hapus aman: database dulu, file Drive di-trash setelahnya.
// File Drive TIDAK disentuh bila proses database gagal.
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireEditor();
  if (error) return error;
  const { id } = await ctx.params;

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("media_assets")
    .select("drive_file_id")
    .eq("id", id)
    .single();
  if (!row) return NextResponse.json({ error: "Media tidak ditemukan." }, { status: 404 });

  const { error: dbError } = await supabase.from("media_assets").delete().eq("id", id);
  if (dbError) {
    return NextResponse.json(
      { error: `Hapus database gagal, file Drive tidak disentuh: ${dbError.message}` },
      { status: 500 }
    );
  }

  const driveFileId = (row as { drive_file_id: string }).drive_file_id;
  if (driveFileId) {
    try {
      await trashDriveFile(driveFileId);
    } catch (e) {
      // DB sudah terhapus; beri warning jelas agar file bisa di-trash manual.
      return NextResponse.json({
        ok: true,
        warning: `Database terhapus, tapi trash Drive gagal: ${e instanceof Error ? e.message : "unknown"}. File dapat di-trash manual di Drive.`,
      });
    }
  }
  return NextResponse.json({ ok: true });
}
