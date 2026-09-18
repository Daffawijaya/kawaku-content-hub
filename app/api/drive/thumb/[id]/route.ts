import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/drive/client";
import { createClient } from "@/lib/supabase/server";

// GET: stream bytes file Drive (butuh login app). Dipakai <img> agar
// thumbnail selalu tampil tanpa sesi Google di browser.
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
