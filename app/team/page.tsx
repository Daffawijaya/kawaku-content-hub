"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { pillWhite } from "@/components/ui/button";
import { TeamManager } from "@/components/team-manager";
import { useMyRole } from "@/lib/use-my-role";
import { usesTeamDb } from "@/lib/team-db";
import { cn } from "@/lib/utils";

export default function TeamPage() {
  const [addOpen, setAddOpen] = useState(false);
  // Tambah anggota = sekalian buat akun login (role admin) → khusus superadmin.
  // Admin biasa: halaman Tim read-only (lihat + cari saja).
  // Mode mock (tanpa DB): akses penuh seperti sebelumnya.
  const { role, loading } = useMyRole();
  const canAdd = !usesTeamDb() || (!loading && role === "superadmin");
  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title="Tim"
        action={
          canAdd ? (
            <button type="button" onClick={() => setAddOpen(true)} className={cn(pillWhite, "min-h-[44px] sm:min-h-0")}>
              Tambah Anggota
            </button>
          ) : undefined
        }
      />
      <TeamManager addOpen={addOpen} onCloseAdd={() => setAddOpen(false)} />
    </div>
  );
}
