import { NextResponse } from "next/server";
import { requireCronOrEditor } from "@/lib/instagram/cron";
import { isInstagramConfigured } from "@/lib/instagram/config";
import { publishContentById } from "@/lib/instagram/publish";
import { ensureFreshToken } from "@/lib/instagram/token";

// Cron tiap 5 mnt: scheduled yg due + belum di IG + belum pernah gagal
// → publish otomatis. GET utk cron, POST utk pemicu manual.
// Gagal: ig_sync_error terisi, status tetap scheduled, cron tidak retry
// (tunggu publish manual) agar Meta tidak dihantam request gagal berulang.
export async function POST(req: Request) {
  return runAutopublish(req);
}

export async function GET(req: Request) {
  return runAutopublish(req);
}

async function runAutopublish(req: Request) {
  const { supabase, error } = await requireCronOrEditor(req);
  if (error) return error;
  if (!isInstagramConfigured()) {
    return NextResponse.json({ error: "Instagram belum dikonfigurasi." }, { status: 503 });
  }
  await ensureFreshToken().catch(() => undefined);

  const { data } = await supabase
    .from("contents")
    .select("id,scheduled_date,scheduled_time,post_role")
    .eq("status", "scheduled")
    .is("ig_media_id", null)
    .is("ig_sync_error", null)
    .limit(10);
  // Hanya milik sendiri (NULL = owner) — collab jangan dipublish otomatis.
  const due = (
    (data ?? []) as { id: string; scheduled_date: string; scheduled_time: string; post_role: string | null }[]
  ).filter((r) => (r.post_role ?? "owner") === "owner" && isDue(r.scheduled_date, r.scheduled_time));

  const published: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const r of due) {
    try {
      await publishContentById(supabase, r.id);
      published.push(r.id);
    } catch (e) {
      failed.push({ id: r.id, error: e instanceof Error ? e.message : "Publish gagal." });
    }
  }
  return NextResponse.json({ ok: true, due: due.length, published, failed });
}

function isDue(date: string, time: string): boolean {
  const t = Date.parse(`${date}T${time.slice(0, 5)}:00+08:00`);
  return !Number.isNaN(t) && t <= Date.now();
}
