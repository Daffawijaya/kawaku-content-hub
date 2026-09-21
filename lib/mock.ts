// Tipe + katalog statis (label, alur status, peran). Tanpa data dummy:
// seluruh isi aplikasi dibaca dari Supabase / Google Drive / Instagram.
export type ContentStatus =
  | "idea"
  | "draft"
  | "review"
  | "revision"
  | "approved"
  | "scheduled"
  | "published";

export type ContentType = "feed" | "carousel" | "reels" | "story";

// Peran akun IG pada sebuah postingan:
// - "owner" = akun KAWAKU yg posting sendiri (atau auto-import dari /media).
// - "collaborator" = akun KAWAKU hanya diundang sbg kolaborator (collab post).
export type PostRole = "owner" | "collaborator";

export const statusMeta: Record<ContentStatus, { label: string }> = {
  idea: { label: "Stok" },
  draft: { label: "Draft" },
  review: { label: "In Review" },
  revision: { label: "Revision" },
  approved: { label: "Approved" },
  scheduled: { label: "Scheduled" },
  published: { label: "Published" },
};

export const typeMeta: Record<ContentType, { label: string }> = {
  feed: { label: "Feed" },
  carousel: { label: "Carousel" },
  reels: { label: "Reels" },
  story: { label: "Story" },
};

export const categories = ["UMKM", "Pariwisata", "Budaya", "Kuliner", "Pertanian"];

export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  active: boolean;
  joinedAt: string; // YYYY-MM-DD
  hasAccount: boolean; // true bila punya akun login (user_id terisi)
  accessRole?: "admin" | "editor" | "viewer" | null; // role akses login (khusus admin)
};

export const memberRoles = ["Graphic Designer", "Videographer"];

export type ManagedContent = {
  id: string;
  title: string;
  type: ContentType;
  status: ContentStatus;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:MM
  pic: string;
  initials: string;
  caption: string;
  hashtags: string;
  category: string;
  notes: string;
  createdAt: string; // YYYY-MM-DD
  updatedAt: string; // YYYY-MM-DD
  tone: string; // thumbnail gradient
  slides?: number;
  igMediaId?: string | null; // id media Instagram (hasil publish / sync)
  publishedUrl?: string | null; // permalink postingan Instagram
  igSyncError?: string | null; // error publish/sync terakhir
  postRole?: PostRole; // owner (default) | collaborator — bedakan postingan sendiri vs collab
};

// Urutan workflow: Draft -> Stok -> Scheduled -> Published
// (Draft boleh langsung ke Scheduled via modal jadwal).
// Save otomatis (form create): tak lengkap → draft, lengkap kecuali
// jadwal → stok, lengkap semua → scheduled.
// Status lama (review/revision/approved) hanya jalan keluar agar
// baris legacy tidak terkunci; tidak ada jalan masuk ke sana.
export const statusFlow: ContentStatus[] = [
  "draft",
  "idea",
  "scheduled",
  "published",
];

export const statusTransitions: Record<ContentStatus, ContentStatus[]> = {
  idea: ["scheduled"],
  draft: ["idea", "scheduled"],
  review: ["idea"],
  revision: ["idea"],
  approved: ["scheduled"],
  scheduled: ["published", "idea"],
  published: [],
};

export const transitionLabels: Record<string, string> = {
  "idea->scheduled": "Jadwalkan",
  "draft->scheduled": "Jadwalkan",
  "draft->idea": "Kembali ke Stok",
  "review->idea": "Kembali ke Stok",
  "revision->idea": "Kembali ke Stok",
  "approved->scheduled": "Jadwalkan",
  "scheduled->idea": "Kembali ke Stok",
  "scheduled->published": "Tandai Published",
};

// Status lama dinormalisasi ke alur baru agar baris legacy tidak hilang.
// ("draft" kini status resmi kolom pertama, bukan legacy lagi.)
export const LEGACY_STATUS: Record<string, ContentStatus> = {
  review: "idea",
  revision: "idea",
  approved: "scheduled",
};

export type HistoryEntry = { status: ContentStatus; at: string; by: string };
export type Comment = { id: string; author: string; text: string; at: string };

export type MediaKind = "image" | "video";

export type MediaAsset = {
  id: string;
  name: string;
  kind: MediaKind;
  type: ContentType; // tipe konten yang memakai aset ini
  sizeLabel: string;
  sizeBytes: number;
  duration?: string; // khusus video
  uploadedAt: string; // YYYY-MM-DD
  uploadedBy: string;
  tone: string; // thumbnail gradient
  usedBy: string[]; // id konten yg memakai aset ini
  driveFileId: string; // Google Drive file id
};

export const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024; // 1 GB

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
