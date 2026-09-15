import { DRIVE_ROOT_FOLDER_ID, driveOAuthEnv, isDriveConfigured } from "./config";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
};

let cachedToken: { token: string; exp: number } | null = null;

export async function getAccessToken(): Promise<string> {
  if (!isDriveConfigured()) throw new Error("Google Drive belum dikonfigurasi.");
  if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
  const { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN } = driveOAuthEnv();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Gagal refresh token Google (cek kredensial / expiry).");
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function driveFetch(path: string, init?: RequestInit) {
  const token = await getAccessToken();
  const res = await fetch(`https://www.googleapis.com${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
  });
  if (res.status === 401) {
    cachedToken = null; // paksa refresh sekali
    const retry = await getAccessToken();
    return fetch(`https://www.googleapis.com${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${retry}`, ...(init?.headers ?? {}) },
    });
  }
  return res;
}

function assertOk(res: Response, action: string) {
  if (!res.ok) throw new Error(`Drive API ${action} gagal (HTTP ${res.status}).`);
}

// Cari / buat subfolder (Images, Videos) di bawah root KAWAKU.
export async function ensureSubfolder(name: "Images" | "Videos"): Promise<string> {
  const token = await getAccessToken();
  const q = encodeURIComponent(
    `name='${name}' and '${DRIVE_ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const found = await (
    await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json() as { files?: { id: string }[] };
  if (found.files?.[0]) return found.files[0].id;

  const res = await driveFetch("/drive/v3/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [DRIVE_ROOT_FOLDER_ID],
    }),
  });
  assertOk(res, "buat folder");
  return ((await res.json()) as { id: string }).id;
}

export function sanitizeFileName(name: string) {
  return name.replace(/[\\/:*?"<>|#]/g, "_").slice(0, 150);
}

export async function uploadToDrive(
  buf: Buffer,
  name: string,
  mimeType: string,
  folderId: string
): Promise<DriveFile> {
  const boundary = `kawaku_${Date.now()}`;
  const meta = JSON.stringify({ name, mimeType, parents: [folderId] });
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const res = await driveFetch("/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: Buffer.concat([head, buf, tail]),
  });
  assertOk(res, "upload");
  return (await res.json()) as DriveFile;
}

// Trash (bukan hapus permanen) — aman, bisa restore dari Drive.
export async function trashDriveFile(fileId: string) {
  const res = await driveFetch(`/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  assertOk(res, "trash");
}

export function webViewUrl(fileId: string) {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

// URL byte langsung (bisa di-cURL Meta) — butuh file publik (lihat makeFilePublic).
export function directDownloadUrl(fileId: string) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

// Jadikan file bisa dibaca siapa saja (idempoten). Dipakai sebelum publish ke IG
// agar Meta bisa mengunduh media. Folder boleh anyone-with-link, tapi file yang
// diupload via API tidak selalu mewarisi — panggil ini eksplisit per file.
export async function makeFilePublic(fileId: string) {
  const res = await driveFetch(`/drive/v3/files/${encodeURIComponent(fileId)}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  assertOk(res, "share publik");
}
