// Konfigurasi Google Drive (SERVER ONLY — tanpa prefix NEXT_PUBLIC_).
const CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET ?? "";
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN ?? "";
export const DRIVE_ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID ?? "";

export function isDriveConfigured() {
  return (
    CLIENT_ID.length > 0 &&
    CLIENT_SECRET.length > 0 &&
    REFRESH_TOKEN.length > 0 &&
    DRIVE_ROOT_FOLDER_ID.length > 0
  );
}

export function driveOAuthEnv() {
  return { CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN };
}
