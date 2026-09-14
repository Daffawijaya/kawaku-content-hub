import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { createClient } from "@/lib/supabase/server";

// GET: relasi media sebuah konten. GET: publik untuk user login (baca).
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const { data, error } = await supabase
    .from("content_media")
    .select("media_id, media_assets(id,name,kind,type,size_label,duration,uploaded_at,uploaded_by,tone,drive_file_id)")
    .eq("content_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    assets: (data ?? []).map((r) => (r as { media_assets: unknown }).media_assets),
  });
}

// POST { mediaIds: string[] }: ganti seluruh relasi (editor+).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { error } = await requireEditor();
  if (error) return error;
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { mediaIds?: unknown } | null;
  const mediaIds = Array.isArray(body?.mediaIds)
    ? (body.mediaIds as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const supabase = await createClient();
  const del = await supabase.from("content_media").delete().eq("content_id", id);
  if (del.error) return NextResponse.json({ error: del.error.message }, { status: 500 });
  if (mediaIds.length > 0) {
    const ins = await supabase
      .from("content_media")
      .insert(mediaIds.map((media_id) => ({ content_id: id, media_id })));
    if (ins.error) return NextResponse.json({ error: ins.error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, count: mediaIds.length });
}
