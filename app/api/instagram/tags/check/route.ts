import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { checkIgUsername } from "@/lib/instagram/client";
import { isInstagramConfigured } from "@/lib/instagram/config";

// GET /api/instagram/tags/check?username=x:
// Pengayaan nama asli utk akun Bisnis/Kreator. Akun personal selalu
// {found:false} (keterbatasan API resmi) — TETAP valid utk di-tag.
// Tanpa koneksi IG → netral {found:false}, jangan blokir user.
export async function GET(req: Request) {
  const { error } = await requireEditor();
  if (error) return error;
  const username = new URL(req.url).searchParams.get("username") ?? "";
  if (!username.trim()) {
    return NextResponse.json({ error: "Username wajib diisi." }, { status: 400 });
  }
  if (!isInstagramConfigured()) {
    return NextResponse.json({ ok: true, found: false, username: username.trim() });
  }
  try {
    const result = await checkIgUsername(username);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cek username gagal." },
      { status: 400 }
    );
  }
}
