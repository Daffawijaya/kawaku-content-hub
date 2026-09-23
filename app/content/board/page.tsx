"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { pillWhite } from "@/components/ui/button";
import { ContentBoard } from "@/components/content-board";
import { CreateModal } from "@/components/create-modal";
import { cn } from "@/lib/utils";

export default function ContentBoardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title="Konten"
        action={
          <button type="button" onClick={() => setCreateOpen(true)} className={cn(pillWhite, "min-h-[44px] sm:min-h-0")}>
            Buat Konten
          </button>
        }
      />
      <ContentBoard key={boardKey} />
      <CreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          setBoardKey((k) => k + 1);
        }}
      />
    </div>
  );
}
