"use client";

import { PageHeader } from "@/components/page-header";
import { MediaLibrary } from "@/components/media-library";

export default function MediaPage() {
  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Etalase aset foto & video KAWAKU. Unggah baru dari form tambah konten."
      />
      <MediaLibrary />
    </div>
  );
}
