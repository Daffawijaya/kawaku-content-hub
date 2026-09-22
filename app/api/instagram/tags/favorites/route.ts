import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { createClient } from "@/lib/supabase/server";

export type FavoriteTag = { username: string; display_name: string | null };

// GET: daftar tag favorit tim (untuk saran teratas di form).
export async function GET() {
  const { error } = await requireEditor();
  if (error) return error;
  try {
    const supabase = await createClient();
    const { data, error: dbError } = await supabase
      .from("ig_favorite_tags")
      .select("username,display_name")
      .order("created_at", { ascending: true })
      .limit(50);
    if (dbError) throw new Error(dbError.message);
    return NextResponse.json({ ok: true, favorites: (data as FavoriteTag[] | null) ?? [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal membaca favorit." },
      { status: 500 }
    );
  }
}

// POST { username, displayName? }: tambah favorit.
export async function POST(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  const body = (await req.json().catch(() => null)) as {
    username?: unknown;
    displayName?: unknown;
  } | null;
  const username =
    typeof body?.username === "string" ? body.username.trim().replace(/^@+/, "").toLowerCase() : "";
  if (!/^[a-z0-9._]{1,30}$/.test(username)) {
    return NextResponse.json({ error: "Username tak valid." }, { status: 400 });
  }
  const displayName =
    typeof body?.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim().slice(0, 80)
      : null;
  try {
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("ig_favorite_tags")
      .upsert({ username, display_name: displayName });
    if (dbError) throw new Error(dbError.message);
    return NextResponse.json({ ok: true, username });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal menambah favorit." },
      { status: 500 }
    );
  }
}

// DELETE /api/instagram/tags/favorites?username=x: hapus favorit.
export async function DELETE(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  const username = new URL(req.url).searchParams.get("username") ?? "";
  if (!username.trim()) {
    return NextResponse.json({ error: "Username wajib diisi." }, { status: 400 });
  }
  try {
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from("ig_favorite_tags")
      .delete()
      .eq("username", username.trim().toLowerCase());
    if (dbError) throw new Error(dbError.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal menghapus favorit." },
      { status: 500 }
    );
  }
}
