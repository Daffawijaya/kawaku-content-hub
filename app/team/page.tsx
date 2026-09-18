"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { pillWhite } from "@/components/ui/button";
import { TeamManager } from "@/components/team-manager";

export default function TeamPage() {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title="Tim"
        action={
          <button type="button" onClick={() => setAddOpen(true)} className={pillWhite}>
            Tambah Anggota
          </button>
        }
      />
      <TeamManager addOpen={addOpen} onCloseAdd={() => setAddOpen(false)} />
    </div>
  );
}
