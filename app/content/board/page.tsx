"use client";

import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { pillWhite } from "@/components/ui/button";
import { ContentBoard } from "@/components/content-board";
import { ContentTabs } from "@/components/content-tabs";
import { CreateModal } from "@/components/create-modal";

export default function ContentBoardPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

  return (
    <div className="-mx-4 -my-6 min-h-[calc(100vh-3.5rem)] px-4 py-4 sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 dark:bg-[#0f0f0f]">
      <PageHeader
        title="Content"
        description="Kelola stok dan konten terjadwal KAWAKU."
        action={
          <button type="button" onClick={() => setCreateOpen(true)} className={pillWhite}>
            Create Content
          </button>
        }
      />
      <ContentTabs active="board" />
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
