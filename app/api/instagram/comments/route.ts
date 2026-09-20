import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { getMediaComments, type IgComment } from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/instagram/comments?ids=a,b: komentar asli IG per postingan.
// Maks 20 id; id yg gagal (mis. token tanpa instagram_manage_comments)
// dilaporkan di `errors` tanpa menggagalkan yg lain.
export async function GET(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, comments: {} });
  }
  const comments: Record<string, IgComment[]> = {};
  const errors: Record<string, string> = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        comments[id] = await getMediaComments(id);
      } catch (e) {
        errors[id] = e instanceof Error ? e.message : "Gagal membaca komentar.";
      }
    })
  );
  return NextResponse.json({ ok: true, comments, errors });
}
