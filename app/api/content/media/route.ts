import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET ?ids=a,b,c: thumbnail pertama tiap konten (1 request untuk daftar).
// GET: publik untuk user login (baca).
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const ids =
    new URL(req.url).searchParams
      .get("ids")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  if (ids.length === 0) return NextResponse.json({ thumbs: {} });
  const capped = ids.slice(0, 100);
  const { data, error } = await supabase
    .from("content_media")
    .select("content_id, media_assets(kind,drive_file_id)")
    .in("content_id", capped);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const thumbs: Record<string, { driveFileId: string; kind: string } | null> = {};
  for (const id of capped) thumbs[id] = null;
  for (const r of (data ?? []) as unknown as {
    content_id: string;
    media_assets: { kind: string; drive_file_id: string } | null;
  }[]) {
    const a = r.media_assets;
    if (
      !thumbs[r.content_id] &&
      a?.drive_file_id &&
      !a.drive_file_id.startsWith("drive_mock_")
    ) {
      thumbs[r.content_id] = { driveFileId: a.drive_file_id, kind: a.kind };
    }
  }
  return NextResponse.json({ thumbs });
}
