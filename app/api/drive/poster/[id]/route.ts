import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/drive/client";
import { createClient } from "@/lib/supabase/server";

// GET: gambar poster kecil dari Drive (thumbnailLink) utk kartu board.
// Jauh lebih ringan drpd stream byte penuh (thumb) — video besar tak perlu
// diunduh hanya utk tampil di kartu kecil. Fallback ke byte penuh bila Drive
// belum punya thumbnail (mis. video baru di-upload).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{10,}$/.test(id)) {
    return NextResponse.json({ error: "ID file tidak valid." }, { status: 400 });
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Sesi habis, silakan masuk ulang." }, { status: 401 });

  let token: string;
  try {
    token = await getAccessToken();
  } catch {
    return NextResponse.json({ error: "Google Drive belum dikonfigurasi." }, { status: 503 });
  }
  try {
    const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=thumbnailLink`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!meta.ok) throw new Error(`meta ${meta.status}`);
    const { thumbnailLink } = (await meta.json()) as { thumbnailLink?: string };
    if (!thumbnailLink) throw new Error("tanpa thumbnail");
    const img = await fetch(thumbnailLink.replace(/=s\d+$/, "=s400"));
    if (!img.ok || !img.body) throw new Error(`img ${img.status}`);
    return new Response(img.body, {
      headers: {
        "Content-Type": img.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    // Fallback: stream byte penuh seperti route thumb.
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok || !res.body) {
      return NextResponse.json({ error: `Drive gagal (HTTP ${res.status}).` }, { status: 502 });
    }
    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }
}
