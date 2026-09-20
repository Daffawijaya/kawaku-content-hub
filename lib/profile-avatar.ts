// Foto profil akun: upload ke Storage bucket "avatars", URL publiknya
// disimpan di profiles.avatar_url. Avatar PIC di tabel dicocokkan via nama.
import { useEffect, useState } from "react";
import { getBrowserClient } from "./supabase/client";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;

// Upload foto milik sendiri → kembalikan URL publik + simpan ke profiles.
// Gagal di tahap mana pun = throw jelas; file lama dibersihkan best-effort.
export async function uploadMyAvatar(file: File, userId: string, prevUrl?: string | null): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Pilih file gambar.");
  if (file.size > MAX_BYTES) throw new Error("Maksimal 2MB.");
  const supabase = getBrowserClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 4);
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error: upError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (upError) throw new Error(`Upload gagal: ${upError.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = data.publicUrl;
  const { error: dbError } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (dbError) {
    try {
      await supabase.storage.from(BUCKET).remove([path]);
    } catch {
      /* rollback best-effort */
    }
    throw new Error(`Simpan gagal: ${dbError.message}`);
  }
  // Bersihkan file lama (best-effort, path diambil dari URL publik).
  const prevPath = prevUrl?.split(`/${BUCKET}/`)[1];
  if (prevPath) {
    try {
      await supabase.storage.from(BUCKET).remove([prevPath]);
    } catch {
      /* abaikan */
    }
  }
  return url;
}

// Hapus foto milik sendiri: URL di-nol-kan dulu, file menyusul best-effort.
export async function deleteMyAvatar(userId: string, prevUrl?: string | null): Promise<void> {
  const supabase = getBrowserClient();
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { error } = await supabase.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) throw new Error(`Hapus gagal: ${error.message}`);
  const prevPath = prevUrl?.split(`/${BUCKET}/`)[1];
  if (prevPath) {
    try {
      await supabase.storage.from(BUCKET).remove([prevPath]);
    } catch {
      /* abaikan */
    }
  }
}

// Event agar navbar langsung refresh tiap foto diganti/dihapus.
export const AVATAR_EVENT = "kawaku:avatar-updated";
export function notifyAvatarUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AVATAR_EVENT));
}

// Peta nama (lowercase) → foto utk avatar PIC. Gagal/kolom belum
// migrasi = peta kosong (tampil inisial), bukan error.
export function useAvatarMap(): Record<string, string> {
  const [map, setMap] = useState<Record<string, string>>({});
  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return;
    (async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("name, avatar_url");
        if (error || !data) return;
        const m: Record<string, string> = {};
        for (const r of data as { name?: string; avatar_url?: string | null }[]) {
          if (r.name && r.avatar_url) m[r.name.trim().toLowerCase()] = r.avatar_url;
        }
        setMap(m);
      } catch {
        /* abaikan: tampil inisial */
      }
    })();
  }, []);
  return map;
}
