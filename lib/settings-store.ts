import type { ContentType } from "@/lib/mock";

export type AppSettings = {
  name: string;
  email: string;
  role: string;
  notif: {
    review: boolean;
    reminder: boolean;
    status: boolean;
  };
  prefs: {
    defaultType: ContentType;
    defaultCategory: string;
    reminderTime: string;
  };
};

export const defaultSettings: AppSettings = {
  name: "Daffa Wijaya",
  email: "daffa@kawaku.id",
  role: "Graphic Designer",
  notif: { review: true, reminder: true, status: false },
  prefs: { defaultType: "reels", defaultCategory: "UMKM", reminderTime: "09:00" },
};

const KEY = "kawaku-settings-v1";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<AppSettings>;
    return {
      ...defaultSettings,
      ...raw,
      notif: { ...defaultSettings.notif, ...(raw.notif ?? {}) },
      prefs: { ...defaultSettings.prefs, ...(raw.prefs ?? {}) },
    };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}
