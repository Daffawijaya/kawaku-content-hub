import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Daftar aset media + relasi konten (RLS user login). Dipakai Media Library & picker.
export async function GET() {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const [{ data: assets, error }, rel] = await Promise.all([
    supabase
      .from("media_assets")
      .select("id,name,kind,type,size_bytes,size_label,duration,uploaded_at,uploaded_by,tone,drive_file_id")
      .order("uploaded_at", { ascending: false }),
    supabase.from("content_media").select("content_id,media_id"),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const usedBy = new Map<string, string[]>();
  for (const r of (rel.data ?? []) as { content_id: string; media_id: string }[]) {
    usedBy.set(r.media_id, [...(usedBy.get(r.media_id) ?? []), r.content_id]);
  }
  return NextResponse.json({
    assets: ((assets ?? []) as Record<string, unknown>[]).map((a) => ({
      ...a,
      usedBy: usedBy.get(a.id as string) ?? [],
    })),
  });
}
