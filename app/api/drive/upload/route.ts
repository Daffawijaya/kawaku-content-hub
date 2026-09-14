import { NextResponse } from "next/server";
import { isDriveConfigured } from "@/lib/drive/config";
import { ensureSubfolder, sanitizeFileName, uploadToDrive } from "@/lib/drive/client";
import { requireEditor } from "@/lib/drive/guard";
import { createClient } from "@/lib/supabase/server";
import { MAX_UPLOAD_BYTES, formatBytes } from "@/lib/mock";

export async function POST(req: Request) {
  const { profile, error } = await requireEditor();
  if (error) return error;
  if (!isDriveConfigured()) {
    return NextResponse.json({ error: "Google Drive belum dikonfigurasi." }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Body harus multipart/form-data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
  }
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return NextResponse.json({ error: "Tipe file harus gambar atau video." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `Ukuran melebihi batas ${formatBytes(MAX_UPLOAD_BYTES)}.` },
      { status: 400 }
    );
  }

  const kind = isVideo ? "video" : "image";
  const type = (form.get("type") as string) || "feed";
  const safeType = ["feed", "carousel", "reels", "story"].includes(type) ? type : "feed";
  const name = `${Date.now()}-${sanitizeFileName(file.name)}`;

  try {
    const folderId = await ensureSubfolder(kind === "video" ? "Videos" : "Images");
    const buf = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadToDrive(buf, name, file.type || "application/octet-stream", folderId);

    const supabase = await createClient();
    const id = `m-${Date.now().toString(36)}`;
    const today = new Date().toISOString().slice(0, 10);
    const { error: dbError } = await supabase.from("media_assets").insert({
      id,
      name: file.name,
      kind,
      type: safeType,
      size_bytes: file.size,
      size_label: formatBytes(file.size),
      duration: null,
      uploaded_at: today,
      uploaded_by: profile.name,
      tone: "",
      drive_file_id: uploaded.id,
    });
    if (dbError) {
      // DB gagal → jangan biarkan file yatim tanpa info: kembalikan error jelas.
      // File Drive dibiarkan (trash manual bila perlu) agar tidak ada hapus diam-diam.
      return NextResponse.json(
        { error: `Upload Drive OK tapi simpan database gagal: ${dbError.message} (file: ${name})` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      asset: {
        id,
        name: file.name,
        kind,
        type: safeType,
        size_bytes: file.size,
        size_label: formatBytes(file.size),
        duration: null,
        uploaded_at: today,
        uploaded_by: profile.name,
        tone: "",
        drive_file_id: uploaded.id,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload gagal." },
      { status: 500 }
    );
  }
}
