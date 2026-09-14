import { createClient } from "@/lib/supabase/server";
import { trashDriveFile } from "./client";
import { isDriveConfigured } from "./config";

// Hapus aset yatim (tidak direlasikan konten mana pun): baris DB dulu,
// file Drive di-trash setelahnya. Best-effort: kegagalan dikembalikan
// sebagai warning, tidak menggagalkan request pemanggil.
export async function trashOrphanAssets(mediaIds: string[]): Promise<string[]> {
  const warnings: string[] = [];
  if (mediaIds.length === 0) return warnings;
  const supabase = await createClient();
  const { data: used } = await supabase
    .from("content_media")
    .select("media_id")
    .in("media_id", mediaIds);
  const usedSet = new Set(((used ?? []) as { media_id: string }[]).map((r) => r.media_id));
  for (const id of mediaIds) {
    if (usedSet.has(id)) continue; // masih dipakai konten lain
    const { data: row } = await supabase
      .from("media_assets")
      .select("drive_file_id")
      .eq("id", id)
      .single();
    const { error } = await supabase.from("media_assets").delete().eq("id", id);
    if (error) {
      warnings.push(`Aset ${id} tidak terhapus: ${error.message}`);
      continue;
    }
    const driveFileId = (row as { drive_file_id?: string } | null)?.drive_file_id;
    if (driveFileId && isDriveConfigured()) {
      try {
        await trashDriveFile(driveFileId);
      } catch (e) {
        warnings.push(`File Drive ${id} gagal di-trash: ${e instanceof Error ? e.message : "unknown"}`);
      }
    }
  }
  return warnings;
}
