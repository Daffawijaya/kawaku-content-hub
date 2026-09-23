import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { isAdminOrAbove } from "@/lib/roles";
import type { AppRole } from "@/lib/supabase/types";

// Guard API: butuh login + role admin/superadmin (keduanya CRUD penuh
// untuk konten/media/analytics/IG). Kembalikan profile bila lolos.
export async function requireEditor(): Promise<
  | { profile: { id: string; email: string; name: string; role: AppRole }; error: null }
  | { profile: null; error: NextResponse }
> {
  if (!isSupabaseConfigured()) {
    return {
      profile: null,
      error: NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 503 }),
    };
  }
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return { profile: null, error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();
  const role = (profile?.role as AppRole | undefined) ?? "admin";
  if (!isAdminOrAbove(role)) {
    return { profile: null, error: NextResponse.json({ error: "Forbidden: butuh role admin." }, { status: 403 }) };
  }
  const name =
    (data.user.user_metadata?.full_name as string | undefined) ??
    data.user.email ??
    "Tim KAWAKU";
  return { profile: { id: data.user.id, email: data.user.email ?? "", name, role }, error: null };
}

// Guard API: admin dan superadmin (fitur umum, kecuali manajemen tim).
export async function requireAdmin(): Promise<
  | { profile: { id: string; email: string; name: string; role: AppRole }; error: null }
  | { profile: null; error: NextResponse }
> {
  return requireEditor();
}

// Guard API: hanya superadmin (manajemen tim).
export async function requireSuperadmin(): Promise<
  | { profile: { id: string; email: string; name: string; role: AppRole }; error: null }
  | { profile: null; error: NextResponse }
> {
  const res = await requireEditor();
  if (res.error) return res;
  if (res.profile.role !== "superadmin") {
    return {
      profile: null,
      error: NextResponse.json({ error: "Forbidden: butuh role superadmin." }, { status: 403 }),
    };
  }
  return res;
}
