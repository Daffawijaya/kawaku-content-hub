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
const CREATED_KEY = "kawaku-content-created-v1";
const DELETED_KEY = "kawaku-content-deleted-v1";
const MEDIA_WARN_KEY = "kawaku-media-warn";

// Status lama (draft/review/revision/approved) dipetakan ke alur baru
// agar data lama (mock & localStorage) tidak hilang dari board.
export const LEGACY_STATUS: Record<string, ContentStatus> = {
  draft: "idea",
  review: "idea",
  revision: "idea",
  approved: "scheduled",
};

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

function readCreated(): ManagedContent[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(CREATED_KEY) ?? "[]") as ManagedContent[];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeCreated(list: ManagedContent[]) {
  localStorage.setItem(CREATED_KEY, JSON.stringify(list));
}

function readDeleted(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(DELETED_KEY) ?? "[]") as string[];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeDeleted(ids: string[]) {
  localStorage.setItem(DELETED_KEY, JSON.stringify(ids));
}

function withOverrides(c: ManagedContent, o: Record<string, Override>): ManagedContent {
  const m = o[c.id]?.patch ? { ...c, ...o[c.id].patch } : c;
  const legacy = LEGACY_STATUS[m.status];
  return legacy ? { ...m, status: legacy } : m;
}

export function getAllContent(): ManagedContent[] {
  const o = readOverrides();
  const deleted = new Set(readDeleted());
  const created = readCreated()
    .filter((c) => !deleted.has(c.id))
    .map((c) => withOverrides(c, o));
  const lib = contentLibrary
    .filter((c) => !deleted.has(c.id))
    .map((c) => withOverrides(c, o));
  return [...created, ...lib];
}

export function getContentDetail(id: string): ContentDetail | undefined {
  if (readDeleted().includes(id)) return undefined;
  const o = readOverrides();
  const custom = readCreated().find((c) => c.id === id);
  const base = custom ?? contentLibrary.find((c) => c.id === id);
  if (!base) return undefined;
  const item = withOverrides(base, o);
  const ov = o[id];
  return {
    ...item,
    history: ov?.history ?? buildHistory(item),
    comments: [...(seedComments[id] ?? []), ...(ov?.extraComments ?? [])],
  };
}

export function createContentItem(item: ManagedContent) {
  writeCreated([item, ...readCreated().filter((c) => c.id !== item.id)]);
}

export function deleteContentItem(id: string) {
  writeCreated(readCreated().filter((c) => c.id !== id));
  const o = readOverrides();
  delete o[id];
  writeOverrides(o);
  const deleted = readDeleted();
  if (!deleted.includes(id)) writeDeleted([...deleted, id]);
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
