"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { MediaLibrary } from "@/components/media-library";

export default function MediaPage() {
  const [uploadOpen, setUploadOpen] = useState(false);
  return (
    <div>
      <PageHeader
        title="Media Library"
        description="Aset foto & video KAWAKU — siap dihubungkan ke Google Drive."
        action={
          <Button size="sm" onClick={() => setUploadOpen((v) => !v)}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        }
      />
      <MediaLibrary uploadOpen={uploadOpen} onCloseUpload={() => setUploadOpen(false)} />
    </div>
  );
}
