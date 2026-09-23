import { NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/drive/guard";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// POST /api/team/create — tambah anggota + buatkan akun login (role admin).
// Hanya superadmin. Butuh SUPABASE_SERVICE_ROLE_KEY di server.
export async function POST(req: Request) {
  const guard = await requireSuperadmin();
  if (guard.error) return guard.error;
  if (!isAdminConfigured()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server." },
      { status: 503 }
    );
  }

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    role?: string;
    email?: string;
    active?: boolean;
    password?: string;
  } | null;
  const name = (body?.name ?? "").trim();
  const role = (body?.role ?? "").trim();
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";
  if (!name) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json({ error: "Password min. 6 karakter." }, { status: 400 });

  const admin = createAdminClient();

  // 1. Akun auth (langsung terkonfirmasi biar bisa login).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (createErr || !created.user) {
    const msg =
      createErr?.message.includes("already been registered") ||
      createErr?.message.includes("already exists")
        ? "Email ini sudah punya akun login."
        : (createErr?.message ?? "Gagal membuat akun login.");
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  const userId = created.user.id;

  try {
    // 2. Profil login role admin (penuh kecuali kelola tim).
    const { error: profileErr } = await admin.from("profiles").insert({
      id: userId,
      email,
      name,
      initials: initialsOf(name),
      role: "admin",
      active: body?.active ?? true,
    });
    if (profileErr) throw new Error(profileErr.message);

    // 3. Baris anggota tim tertaut ke akun.
    const { data: member, error: memberErr } = await admin
      .from("team_members")
      .insert({
        name,
        initials: initialsOf(name),
        role,
        email,
        active: body?.active ?? true,
        user_id: userId,
      })
      .select("*")
      .single();
    if (memberErr) throw new Error(memberErr.message);

    return NextResponse.json({
      member: {
        id: member.id,
        name: member.name,
        initials: member.initials,
        role: member.role,
        email: member.email,
        active: member.active,
        joinedAt: String(member.joined_at).slice(0, 10),
        hasAccount: true,
        accessRole: "admin",
      },
    });
  } catch (e) {
    // Rollback: jangan sisakan akun yatim bila profil/anggota gagal.
    await admin.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Gagal membuat anggota + akun." },
      { status: 500 }
    );
  }
}
