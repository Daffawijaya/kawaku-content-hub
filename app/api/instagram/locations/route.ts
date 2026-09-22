import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { validateIgLocation } from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/instagram/locations?id=12345: validasi ID lokasi (Facebook Page
// berdata lokasi) untuk location_id publish (feed/carousel/reels).
export async function GET(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  const id = new URL(req.url).searchParams.get("id") ?? "";
  try {
    const location = await validateIgLocation(id);
    return NextResponse.json({ ok: true, location });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Validasi lokasi gagal." },
      { status: 400 }
    );
  }
}
