import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/drive/guard";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { ACCESS_ROLES } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/types";

// PATCH /api/team/[id]/role — ganti role akses login anggota.
// Hanya superadmin. Hanya anggota yg sudah tertaut akun.
// Butuh SUPABASE_SERVICE_ROLE_KEY di server.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireSuperadmin();
  if (guard.error) return guard.error;
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { role?: string } | null;
  const role = body?.role as AppRole | undefined;
  if (!role || !ACCESS_ROLES.includes(role))
    return NextResponse.json({ error: "Role akses tidak dikenal." }, { status: 400 });

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

  // Proteksi: jangan demote diri sendiri bila satu-satunya superadmin.
  if (userId === guard.profile.id && role !== "superadmin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "superadmin");
    if ((count ?? 1) <= 1)
      return NextResponse.json(
        { error: "Tidak bisa demote superadmin terakhir." },
        { status: 400 }
      );
  }

  const { error: updateErr } = await admin.from("profiles").update({ role }).eq("id", userId);
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, role });
}
