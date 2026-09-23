import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { memberRoles } from "@/lib/mock";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

async function ownId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// GET /api/team/me — baris anggota tim milik akun yg login (null bila tak tertaut).
export async function GET() {
  const uid = await ownId();
  if (!uid) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isAdminConfigured())
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });
  const admin = createAdminClient();
  const { data } = await admin
    .from("team_members")
    .select("id, name, role")
    .eq("user_id", uid)
    .maybeSingle();
  const row = data as { id: string; name: string; role: string } | null;
  return NextResponse.json({ member: row });
}

// PATCH /api/team/me — ubah nama/jabatan milik sendiri saja.
// Role akses login (admin/superadmin) TIDAK bisa diubah dari sini.
export async function PATCH(req: Request) {
  const uid = await ownId();
  if (!uid) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  if (!isAdminConfigured())
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    role?: string;
  } | null;
  const patch: { name?: string; initials?: string; role?: string } = {};
  if (body?.name !== undefined) {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
    patch.name = name;
    patch.initials = initialsOf(name);
  }
  if (body?.role !== undefined) {
    if (!memberRoles.includes(body.role))
      return NextResponse.json({ error: "Jabatan tidak dikenal." }, { status: 400 });
    patch.role = body.role;
  }
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("team_members")
    .update(patch)
    .eq("user_id", uid)
    .select("id, name, role")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)
    return NextResponse.json({ error: "Akun ini belum tertaut ke anggota tim." }, { status: 404 });
  return NextResponse.json({ member: data });
}
