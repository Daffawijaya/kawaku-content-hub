import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { createClient } from "@/lib/supabase/server";

// GET: 15 username IG paling sering di-tag di konten (untuk rekomendasi
// saat mengetik di form). Murni data lokal — jalan tanpa koneksi Meta.
export async function GET() {
  const { error } = await requireEditor();
  if (error) return error;
  try {
    const supabase = await createClient();
    const { data, error: dbError } = await supabase
      .from("contents")
      .select("ig_user_tags")
      .order("updated_at", { ascending: false })
      .limit(300);
    if (dbError) throw new Error(dbError.message);
    const counts = new Map<string, number>();
    for (const row of (data as { ig_user_tags?: unknown }[] | null) ?? []) {
      const tags: unknown = row.ig_user_tags;
      const list: string[] = Array.isArray(tags)
        ? tags.filter((t): t is string => typeof t === "string")
        : typeof tags === "string"
          ? (() => {
              try {
                const p: unknown = JSON.parse(tags);
                return Array.isArray(p) ? p.filter((t): t is string => typeof t === "string") : [];
              } catch {
                return [];
              }
            })()
          : [];
      for (const t of list) {
        const u = t.trim().replace(/^@+/, "").toLowerCase();
        if (/^[a-z0-9._]{1,30}$/.test(u)) counts.set(u, (counts.get(u) ?? 0) + 1);
      }
    }
    const tags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([username, count]) => ({ username, count }));
    // Favorit tim (tabel opsional — DB lama tanpa migrasi tetap jalan).
    let favorites: { username: string; display_name: string | null }[] = [];
    try {
      const { data: favs } = await supabase
        .from("ig_favorite_tags")
        .select("username,display_name")
        .order("created_at", { ascending: true })
        .limit(50);
      if (favs) favorites = favs as typeof favorites;
    } catch {
      /* abaikan */
    }
    return NextResponse.json({ ok: true, tags, favorites });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal membaca tag populer." },
      { status: 500 }
    );
  }
}
