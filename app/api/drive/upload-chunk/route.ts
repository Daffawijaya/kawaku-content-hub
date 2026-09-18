import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDriveConfigured } from "@/lib/drive/config";
import {
  RESUME_CHUNK,
  createResumeSession,
  ensureSubfolder,
  putResumeChunk,
  sanitizeFileName,
  type DriveFile,
} from "@/lib/drive/client";
import { requireEditor } from "@/lib/drive/guard";
import { createClient } from "@/lib/supabase/server";
import { MAX_UPLOAD_BYTES, formatBytes } from "@/lib/mock";

// POST multipart 1 chunk (≤4 MB, aman limit bodi Hobby): browser mencacah,
// server meneruskan ke sesi resumable Google. Chunk pertama (index 0)
// membuka sesi; chunk terakhir menutup + mencatat media_assets.
// Field: uploadId (kosong di chunk 0), index, total, fileName, mimeType,
// kind (image/video), type (feed/carousel/reels), fileSize (total byte),
// file = Blob chunk. Balasan: { uploadId, done } / { done, asset }.

type Session = {
  session: string;
  name: string;
  mimeType: string;
  kind: string;
  type: string;
  fileName: string;
  fileSize: number;
  total: number;
  by: string;
  exp: number;
};

// Sesi hidup di memori (metadata kecil); basi >2 jam disapu tiap request.
// ponytail: pindah ke DB/Redis bila multi-instance atau 1000+ upload/hari.
const sessions = new Map<string, Session>();

function sweep() {
  if (sessions.size < 100) return;
  const now = Date.now();
  for (const [k, v] of sessions) {
    if (v.exp < now) sessions.delete(k);
  }
}

function newUploadId() {
  return `u-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function insertAsset(
  supabase: SupabaseClient,
  input: {
    kind: string;
    type: string;
    fileName: string;
    fileSize: number;
    by: string;
    driveFileId: string;
  }
) {
  const sizeLabel = formatBytes(input.fileSize);
  const id = `m-${Date.now().toString(36)}`;
  const today = new Date().toISOString().slice(0, 10);
  const { error: dbError } = await supabase.from("media_assets").insert({
    id,
    name: input.fileName,
    kind: input.kind,
    type: input.type,
    size_bytes: input.fileSize,
    size_label: sizeLabel,
    duration: null,
    uploaded_at: today,
    uploaded_by: input.by,
    tone: "",
    drive_file_id: input.driveFileId,
  });
  if (dbError) {
    // DB gagal → jangan biarkan file yatim tanpa info: kembalikan error jelas.
    // File Drive dibiarkan (trash manual bila perlu) agar tidak ada hapus diam-diam.
    throw new Error(`Unggah Drive OK tapi simpan database gagal: ${dbError.message}`);
  }
  return {
    id,
    name: input.fileName,
    kind: input.kind,
    type: input.type,
    size_bytes: input.fileSize,
    size_label: sizeLabel,
    duration: null,
    uploaded_at: today,
    uploaded_by: input.by,
    tone: "",
    drive_file_id: input.driveFileId,
  };
}

export async function POST(req: Request) {
  const { profile, error } = await requireEditor();
  if (error) return error;
  if (!isDriveConfigured()) {
    return NextResponse.json({ error: "Google Drive belum dikonfigurasi." }, { status: 503 });
  }
  sweep();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body harus multipart/form-data." }, { status: 400 });
  }
  const str = (k: string) => (form.get(k) as string | null) ?? "";
  const index = Math.max(0, Number(str("index")) || 0);
  const total = Math.max(1, Number(str("total")) || 1);
  const fileSize = Math.max(1, Number(str("fileSize")) || 0);
  const chunk = form.get("file");
  if (!(chunk instanceof File) || chunk.size === 0) {
    return NextResponse.json({ error: "Chunk tidak ditemukan." }, { status: 400 });
  }

  let ses = sessions.get(str("uploadId"));
  if (!ses) {
    if (index !== 0) {
      return NextResponse.json({ error: "Sesi upload kedaluwarsa — ulangi dari awal." }, { status: 410 });
    }
    const mimeType = str("mimeType") || "application/octet-stream";
    if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
      return NextResponse.json({ error: "Tipe file harus gambar atau video." }, { status: 400 });
    }
    if (fileSize > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: `Ukuran melebihi batas ${formatBytes(MAX_UPLOAD_BYTES)}.` },
        { status: 400 }
      );
    }
    const kind = mimeType.startsWith("video/") ? "video" : "image";
    const type = str("type");
    const safeType = ["feed", "carousel", "reels"].includes(type) ? type : "feed";
    const fileName = str("fileName") || "upload";
    try {
      const folderId = await ensureSubfolder(kind === "video" ? "Videos" : "Images");
      const name = `${Date.now()}-${sanitizeFileName(fileName)}`;
      const session = await createResumeSession(name, mimeType, folderId, fileSize);
      const uploadId = newUploadId();
      ses = {
        session,
        name,
        mimeType,
        kind,
        type: safeType,
        fileName,
        fileSize,
        total,
        by: profile.name,
        exp: Date.now() + 2 * 3600_000,
      };
      sessions.set(uploadId, ses);
      // Lanjut ke pengiriman chunk pertama di bawah dengan uploadId baru.
      return await putChunk(uploadId, ses, index, chunk);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Unggah gagal." },
        { status: 500 }
      );
    }
  }
  return await putChunk(str("uploadId"), ses, index, chunk);
}

async function putChunk(uploadId: string, ses: Session, index: number, chunk: File) {
  try {
    const buf = Buffer.from(await chunk.arrayBuffer());
    const start = index * RESUME_CHUNK;
    const end = Math.min(start + buf.length, ses.fileSize);
    // Salin ke buffer fresh agar lolos tipe BlobPart DOM.
    const view = new Uint8Array(buf.length);
    view.set(buf);
    const file: DriveFile | null = await putResumeChunk(
      ses.session,
      new Blob([view]),
      buf.length,
      { start, end, total: ses.fileSize }
    );
    if (!file) return NextResponse.json({ uploadId, done: false });
    sessions.delete(uploadId);
    const supabase = await createClient();
    const asset = await insertAsset(supabase, {
      kind: ses.kind,
      type: ses.type,
      fileName: ses.fileName,
      fileSize: ses.fileSize,
      by: ses.by,
      driveFileId: file.id,
    });
    return NextResponse.json({ done: true, asset });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unggah gagal." },
      { status: 500 }
    );
  }
}
