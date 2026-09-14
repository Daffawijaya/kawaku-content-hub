import {
  buildHistory,
  contentLibrary,
  seedComments,
  type Comment,
  type ContentStatus,
  type HistoryEntry,
  type ManagedContent,
} from "@/lib/mock";

export type ContentDetail = ManagedContent & {
  history: HistoryEntry[];
  comments: Comment[];
};

type Override = {
  patch: Partial<ManagedContent>;
  history?: HistoryEntry[];
  extraComments?: Comment[];
};

const KEY = "kawaku-content-v1";
const SAVED_FLAG = "kawaku-saved-id";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function readOverrides(): Record<string, Override> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<string, Override>;
  } catch {
    return {};
  }
}

function writeOverrides(o: Record<string, Override>) {
  localStorage.setItem(KEY, JSON.stringify(o));
}

export function getAllContent(): ManagedContent[] {
  const o = readOverrides();
  return contentLibrary.map((c) => (o[c.id]?.patch ? { ...c, ...o[c.id].patch } : c));
}

export function getContentDetail(id: string): ContentDetail | undefined {
  const base = contentLibrary.find((c) => c.id === id);
  if (!base) return undefined;
  const ov = readOverrides()[id];
  const merged = ov?.patch ? { ...base, ...ov.patch } : base;
  return {
    ...merged,
    history: ov?.history ?? buildHistory(merged),
    comments: [...(seedComments[id] ?? []), ...(ov?.extraComments ?? [])],
  };
}

export function saveContentItem(id: string, patch: Partial<ManagedContent>) {
  const o = readOverrides();
  const prev = o[id] ?? { patch: {} };
  o[id] = { ...prev, patch: { ...prev.patch, ...patch, updatedAt: todayISO() } };
  writeOverrides(o);
}

export function changeContentStatus(id: string, to: ContentStatus, by = "Daffa Wijaya") {
  const detail = getContentDetail(id);
  if (!detail) return;
  const o = readOverrides();
  const prev = o[id] ?? { patch: {} };
  o[id] = {
    patch: { ...prev.patch, status: to, updatedAt: todayISO() },
    history: [...(prev.history ?? buildHistory(detail)), { status: to, at: todayISO(), by }],
    extraComments: prev.extraComments,
  };
  writeOverrides(o);
}

export function addContentComment(id: string, text: string, author = "Daffa Wijaya") {
  const o = readOverrides();
  const prev = o[id] ?? { patch: {} };
  const comment: Comment = {
    id: `cm-${Date.now()}`,
    author,
    text,
    at: todayISO(),
  };
  o[id] = { ...prev, extraComments: [...(prev.extraComments ?? []), comment] };
  writeOverrides(o);
  return comment;
}

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
