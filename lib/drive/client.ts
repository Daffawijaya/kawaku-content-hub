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

// Upload resumable Google Drive sebagai primitif: sesi dibuat sekali,
// tiap chunk di-PUT dengan retry. Dipakai upload-chunk (browser mencacah,
// server meneruskan) agar file besar lolos limit bodi & tahan putus.
// Chunk 4 MB: aman dari batas bodi Hobby (±4,5 MB).
export const RESUME_CHUNK = 4 * 1024 * 1024;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function createResumeSession(
  name: string,
  mimeType: string,
  folderId: string,
  total: number
): Promise<string> {
  const token = await getAccessToken();
  const init = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": mimeType,
      "X-Upload-Content-Length": String(total),
    },
    body: JSON.stringify({ name, mimeType, parents: [folderId] }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!init.ok) throw new Error(`Drive API mulai-upload gagal (HTTP ${init.status}).`);
  const session = init.headers.get("location");
  if (!session) throw new Error("Drive API tak mengembalikan sesi upload.");
  return session;
}

// Kirim 1 chunk ke sesi. Kembali file Drive bila ini chunk terakhir,
// null bila sesi minta lanjut (308). body = Blob/ArrayBuffer/View.
export async function putResumeChunk(
  session: string,
  body: BodyInit,
  size: number,
  range: { start: number; end: number; total: number }
): Promise<DriveFile | null> {
  const token = await getAccessToken();
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(session, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Length": String(size),
        "Content-Range": `bytes ${range.start}-${range.end - 1}/${range.total}`,
      },
      body,
      signal: AbortSignal.timeout(120_000),
    }).catch(() => null);
    // 308 = chunk diterima, lanjut; 200 = chunk terakhir + selesai.
    if (res?.status === 308) return null;
    if (res?.ok) return (await res.json()) as DriveFile;
    if (attempt >= 2) {
      throw new Error(
        res ? `Drive API upload gagal (HTTP ${res.status}).` : "Koneksi ke Drive putus berulang — coba lagi."
      );
    }
    await sleep(1000 * (attempt + 1));
  }
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
