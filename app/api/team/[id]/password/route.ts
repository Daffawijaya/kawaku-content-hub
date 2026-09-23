import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/drive/guard";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

// POST /api/team/[id]/password — ganti password akun login anggota.
// Hanya superadmin, hanya anggota yg sudah tertaut akun (user_id).
// Butuh SUPABASE_SERVICE_ROLE_KEY di server.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSuperadmin();
  if (guard.error) return guard.error;
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";
  if (password.length < 6)
    return NextResponse.json({ error: "Password min. 6 karakter." }, { status: 400 });

  const admin = createAdminClient();
  const { data: row, error: rowErr } = await admin
    .from("team_members")
    .select("user_id")
    .eq("id", id)
    .single();
  if (rowErr || !row) return NextResponse.json({ error: "Anggota tidak ditemukan." }, { status: 404 });
  const userId = (row as { user_id: string | null }).user_id;
  if (!userId)
    return NextResponse.json({ error: "Anggota ini belum punya akun login." }, { status: 404 });

  const { error: updateErr } = await admin.auth.admin.updateUserById(userId, { password });
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
