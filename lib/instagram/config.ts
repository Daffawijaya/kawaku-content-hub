// Konfigurasi Instagram Graph API via Facebook Login (SERVER ONLY).
// Prasyarat: akun IG Business terhubung ke FB Page, Meta App dengan
// permission instagram_basic + instagram_content_publish (+ instagram_manage_contents
// untuk hapus, + instagram_manage_comments untuk baca komentar).
// Token = Page access token long-lived.
export const IG_GRAPH_HOST = "https://graph.facebook.com";
const API_VERSION = "v26.0";

export const IG_USER_ID = process.env.IG_USER_ID ?? "";
const PAGE_TOKEN = process.env.IG_PAGE_ACCESS_TOKEN ?? "";
export const IG_APP_ID = process.env.IG_APP_ID ?? "";
const APP_SECRET = process.env.IG_APP_SECRET ?? "";

export function isInstagramConfigured() {
  return IG_USER_ID.length > 0 && PAGE_TOKEN.length > 0;
}

export function isRefreshConfigured() {
  return IG_APP_ID.length > 0 && APP_SECRET.length > 0;
}

export function igAppAuth() {
  return { appId: IG_APP_ID, appSecret: APP_SECRET };
}

export function igApiVersion() {
  return API_VERSION;
}
