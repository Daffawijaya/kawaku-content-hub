"use client";

import { useEffect, useState } from "react";
import { getBrowserClient } from "./supabase/client";
import type { AppRole } from "./supabase/types";

// Role akun yg sedang login (null = belum login / belum termuat).
// Dipakai untuk gate UI berbasis role; penegakan nyata tetap di RLS + API.
export function useMyRole() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const supabase = getBrowserClient();
        if (!supabase) return; // mode mock
        const { data } = await supabase.auth.getUser();
        if (!data.user || !live) return;
        const { data: row } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        if (live && row) setRole((row as { role: AppRole }).role);
      } catch {
        // abaikan — UI fallback ke read-only
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  return { role, loading };
}
