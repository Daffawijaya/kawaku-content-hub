import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/supabase/types";

// Guard API: butuh login + role editor/admin. Kembalikan profile bila lolos.
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
  const role = (profile?.role as AppRole | undefined) ?? "viewer";
  if (role !== "admin" && role !== "editor") {
    return { profile: null, error: NextResponse.json({ error: "Forbidden: butuh role editor." }, { status: 403 }) };
  }
  const name =
    (data.user.user_metadata?.full_name as string | undefined) ??
    data.user.email ??
    "Tim KAWAKU";
  return { profile: { id: data.user.id, email: data.user.email ?? "", name, role }, error: null };
}
