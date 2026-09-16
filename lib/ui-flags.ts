// Flag sekali-pakai antar halaman via sessionStorage (mis. “baru disimpan”
// setelah redirect). Bukan data — hilang saat tab ditutup.
const SAVED_FLAG = "kawaku-saved-id";
const MEDIA_WARN_KEY = "kawaku-media-warn";

export function markSaved(id: string) {
  try {
    sessionStorage.setItem(SAVED_FLAG, id);
  } catch {
    /* abaikan */
  }
}

export function consumeSaved(): string | null {
  try {
    const v = sessionStorage.getItem(SAVED_FLAG);
    if (v) sessionStorage.removeItem(SAVED_FLAG);
    return v;
  } catch {
    return null;
  }
}

export function markMediaWarning(msg: string) {
  try {
    sessionStorage.setItem(MEDIA_WARN_KEY, msg);
  } catch {
    /* abaikan */
  }
}

export function consumeMediaWarning(): string | null {
  try {
    const v = sessionStorage.getItem(MEDIA_WARN_KEY);
    if (v) sessionStorage.removeItem(MEDIA_WARN_KEY);
    return v;
  } catch {
    return null;
  }
}
