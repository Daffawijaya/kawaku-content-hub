import { NextResponse } from "next/server";
import { requireEditor } from "@/lib/drive/guard";
import { createAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const CRON_SECRET = process.env.CRON_SECRET ?? "";

// Auth cron (Vercel mengirim Authorization: Bearer $CRON_SECRET) atau sesi admin/superadmin.
// Kembalikan client yg sesuai: admin (bypass RLS) utk cron, user utk sesi.
export async function requireCronOrEditor(req: Request): Promise<
  | { supabase: SupabaseClient; error: null }
  | { supabase: null; error: NextResponse }
> {
  const auth = req.headers.get("authorization") ?? "";
  if (CRON_SECRET && auth === `Bearer ${CRON_SECRET}`) {
    if (!isAdminConfigured()) {
      return {
        supabase: null,
        error: NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi." }, { status: 503 }),
      };
    }
    return { supabase: createAdminClient(), error: null };
  }
  const { error } = await requireEditor();
  if (error) return { supabase: null, error };
  return { supabase: await createClient(), error: null };
}
