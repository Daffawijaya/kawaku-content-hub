// Upload browser → Drive per chunk (4 MB): lolos limit bodi server,
// gagal di 1 chunk = ulangi chunk itu saja. Bentuk balikan sama seperti
// upload single-shot lama agar pemanggil tak berubah.

export const BROWSER_CHUNK = 4 * 1024 * 1024;

export type ChunkedAsset = { id: string; name: string };

type ChunkReply = {
  uploadId?: string;
  done?: boolean;
  asset?: ChunkedAsset;
  error?: string;
};

export async function uploadFileChunked(
  file: File,
  type: string,
  onProgress?: (sent: number, total: number) => void
): Promise<ChunkedAsset> {
  const total = Math.max(1, Math.ceil(file.size / BROWSER_CHUNK));
  let uploadId = "";
  let restarts = 0;
  for (let index = 0; index < total; index++) {
    const fd = new FormData();
    fd.append("uploadId", uploadId);
    fd.append("index", String(index));
    fd.append("total", String(total));
    fd.append("fileName", file.name);
    fd.append("mimeType", file.type);
    fd.append("type", type);
    fd.append("fileSize", String(file.size));
    fd.append("file", file.slice(index * BROWSER_CHUNK, (index + 1) * BROWSER_CHUNK));
    let reply: ChunkReply | null = null;
    for (let attempt = 0; ; attempt++) {
      const res = await fetch("/api/drive/upload-chunk", { method: "POST", body: fd }).catch(
        () => null
      );
      reply = (await res?.json().catch(() => null)) as ChunkReply | null;
      if (res?.ok && reply && !reply.error) break;
      // 410 = sesi basi → mulai dari chunk 0 dengan sesi baru (maks 2x).
      if (res?.status === 410) {
        if (++restarts > 2) throw new Error("Sesi upload kedaluwarsa berulang — coba lagi.");
        uploadId = "";
        index = -1;
        break;
      }
      if (attempt >= 2) {
        throw new Error(reply?.error ?? `Upload gagal (HTTP ${res?.status ?? "?"}).`);
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
    // Mulai ulang sesi: index -1 + continue → 0.
    if (index === -1) continue;
    if (reply?.uploadId) uploadId = reply.uploadId;
    onProgress?.(index + 1, total);
    if (reply?.done) {
      if (!reply.asset) throw new Error("Upload selesai tanpa info aset.");
      return reply.asset;
    }
  }
  throw new Error("Upload tak selesai.");
}
