// URL thumbnail via API app (bukan langsung ke Google) agar selalu tampil
// selama user login — tanpa butuh sesi Google di browser.
export function thumbUrl(driveFileId: string): string {
  return `/api/drive/thumb/${encodeURIComponent(driveFileId)}`;
}

// Poster kecil (thumbnailLink Drive) utk kartu board — KB-an, bukan byte penuh.
export function posterUrl(driveFileId: string): string {
  return `/api/drive/poster/${encodeURIComponent(driveFileId)}`;
}
