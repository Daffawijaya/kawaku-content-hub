import { createClient as createSbClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Client service-role (SERVER ONLY, untuk cron tanpa sesi user — bypass RLS).
// Jangan pernah import dari komponen client atau kirim key ke browser.
export function isAdminConfigured() {
  return SUPABASE_URL.length > 0 && SERVICE_KEY.length > 0;
}

export function createAdminClient(): SupabaseClient {
  if (!isAdminConfigured()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
  }
  return createSbClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
}
