import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/drive/guard";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

// DELETE /api/team/[id] — hapus anggota + akun login yg tertaut (bila ada).
// Hanya admin. Butuh SUPABASE_SERVICE_ROLE_KEY di server.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server." },
      { status: 503 }
    );
  }

  const { id } = await params;
  const admin = createAdminClient();
  const { data: row, error: rowErr } = await admin
    .from("team_members")
    .select("user_id")
    .eq("id", id)
    .single();
  if (rowErr || !row) return NextResponse.json({ error: "Anggota tidak ditemukan." }, { status: 404 });
  const userId = (row as { user_id: string | null }).user_id;

  const { error: delErr } = await admin.from("team_members").delete().eq("id", id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  let accountDeleted = false;
  if (userId) {
    // profiles ikut terhapus via FK cascade; akun auth dihapus eksplisit.
    const { error: authErr } = await admin.auth.admin.deleteUser(userId);
    accountDeleted = !authErr;
  }
  return NextResponse.json({ ok: true, accountDeleted });
}
