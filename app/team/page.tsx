"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { TeamManager } from "@/components/team-manager";

export default function TeamPage() {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div>
      <PageHeader
        title="Tim"
        action={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" /> Tambah Anggota
          </Button>
        }
      />
      <TeamManager addOpen={addOpen} onCloseAdd={() => setAddOpen(false)} />
    </div>
  );
}
