export type ContentStatus =
  | "idea"
  | "draft"
  | "review"
  | "revision"
  | "approved"
  | "scheduled"
  | "published";

export type ContentType = "feed" | "carousel" | "reels" | "story";

export type ContentItem = {
  id: string;
  title: string;
  format: string;
  channel: string;
  status: ContentStatus;
  date: string;
  assignee: string;
  initials: string;
};

export const stats = [
  { key: "total", label: "Total Content", value: "128", delta: "+12 bulan ini" },
  { key: "draft", label: "Draft", value: "24", delta: "6 perlu dilengkapi" },
  { key: "review", label: "In Review", value: "18", delta: "4 menunggu approval" },
  { key: "scheduled", label: "Scheduled", value: "32", delta: "8 minggu ini" },
  { key: "published", label: "Published", value: "54", delta: "+9 bulan ini" },
] as const;

export const upcomingContent: ContentItem[] = [
  { id: "1", title: "Panen Raya Hortikultura Kukar", format: "Reels", channel: "Instagram", status: "scheduled", date: "Sen, 15 Sep • 09:00", assignee: "Sinta Maharani", initials: "SM" },
  { id: "2", title: "UMKM Kopi Luwak Mahakam", format: "Artikel", channel: "Website", status: "review", date: "Sen, 15 Sep • 13:00", assignee: "Bima Pratama", initials: "BP" },
  { id: "3", title: "Festival Budaya Erau 2026", format: "Carousel", channel: "Instagram", status: "scheduled", date: "Sel, 16 Sep • 10:00", assignee: "Daffa Wijaya", initials: "DW" },
  { id: "4", title: "Ekowisata Mangrove Balikpapan", format: "Video", channel: "YouTube", status: "draft", date: "Rab, 17 Sep • 15:00", assignee: "Nadia Putri", initials: "NP" },
];

export const recentContent: ContentItem[] = [
  { id: "5", title: "Pasar Digital UMKM Samarinda", format: "Artikel", channel: "Website", status: "published", date: "12 Sep 2026", assignee: "Bima Pratama", initials: "BP" },
  { id: "6", title: "Kuliner Amplang Khas Kaltim", format: "Reels", channel: "TikTok", status: "published", date: "11 Sep 2026", assignee: "Sinta Maharani", initials: "SM" },
  { id: "7", title: "Profil Pengrajin Ulap Doyo", format: "Foto Esai", channel: "Instagram", status: "review", date: "10 Sep 2026", assignee: "Nadia Putri", initials: "NP" },
  { id: "8", title: "Rute Wisata Susur Mahakam", format: "Video", channel: "YouTube", status: "draft", date: "9 Sep 2026", assignee: "Daffa Wijaya", initials: "DW" },
];

export const weekPreview = [
  { day: "Sen", date: "15", count: 3, active: true },
  { day: "Sel", date: "16", count: 2, active: false },
  { day: "Rab", date: "17", count: 4, active: false },
  { day: "Kam", date: "18", count: 1, active: false },
  { day: "Jum", date: "19", count: 5, active: false },
  { day: "Sab", date: "20", count: 2, active: false },
  { day: "Min", date: "21", count: 0, active: false },
];

export const statusMeta: Record<ContentStatus, { label: string }> = {
  idea: { label: "Idea" },
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

export const teamNames = [
  "Sinta Maharani",
  "Bima Pratama",
  "Nadia Putri",
  "Daffa Wijaya",
  "Rizky Ramadhan",
];

export type TeamMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  active: boolean;
  joinedAt: string; // YYYY-MM-DD
};

export const memberRoles = [
  "Content Lead",
  "Videographer",
  "Writer",
  "Designer",
  "Social Media Specialist",
  "Intern",
];

export const teamMembers: TeamMember[] = [
  { id: "t1", name: "Daffa Wijaya", initials: "DW", role: "Content Lead", email: "daffa@kawaku.id", active: true, joinedAt: "2025-11-02" },
  { id: "t2", name: "Sinta Maharani", initials: "SM", role: "Videographer", email: "sinta@kawaku.id", active: true, joinedAt: "2026-01-12" },
  { id: "t3", name: "Bima Pratama", initials: "BP", role: "Writer", email: "bima@kawaku.id", active: true, joinedAt: "2026-02-03" },
  { id: "t4", name: "Nadia Putri", initials: "NP", role: "Designer", email: "nadia@kawaku.id", active: true, joinedAt: "2026-03-17" },
  { id: "t5", name: "Rizky Ramadhan", initials: "RR", role: "Social Media Specialist", email: "rizky@kawaku.id", active: true, joinedAt: "2026-05-09" },
  { id: "t6", name: "Anisa Rahma", initials: "AR", role: "Intern", email: "anisa@kawaku.id", active: false, joinedAt: "2026-07-21" },
];

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
};

export const contentLibrary: ManagedContent[] = [
  { id: "c1", title: "Panen Raya Hortikultura Kukar", type: "reels", status: "scheduled", scheduledDate: "2026-09-15", scheduledTime: "09:00", pic: "Sinta Maharani", initials: "SM", category: "Pertanian", caption: "Panen raya melon premium di Kukar! Petani lokal naik kelas dengan pendampingan intensif. Simak keseruannya sampai habis ya.", hashtags: "#kawaku #kukar #petanimuda #panenraya", notes: "Pastikan subtitle burned-in sebelum jadwal tayang.", createdAt: "2026-09-08", updatedAt: "2026-09-12", tone: "from-brand-100 to-teal-50 dark:from-brand-950 dark:to-zinc-900" },
  { id: "c2", title: "UMKM Kopi Luwak Mahakam", type: "feed", status: "review", scheduledDate: "2026-09-15", scheduledTime: "13:00", pic: "Bima Pratama", initials: "BP", category: "UMKM", caption: "Dari biji ke cangkir: perjalanan kopi luwak Mahakam yang mendunia. Geser untuk lihat prosesnya.", hashtags: "#kawaku #umkm #kopikaltim", notes: "Menunggu approval foto hero dari tim lapangan.", createdAt: "2026-09-09", updatedAt: "2026-09-13", tone: "from-amber-100 to-orange-50 dark:from-amber-950 dark:to-zinc-900" },
  { id: "c3", title: "Festival Budaya Erau 2026", type: "carousel", status: "scheduled", scheduledDate: "2026-09-16", scheduledTime: "10:00", pic: "Daffa Wijaya", initials: "DW", category: "Budaya", caption: "5 momen terbaik Festival Erau 2026 yang tidak boleh kamu lewatkan. Slide 3 paling merinding!", hashtags: "#kawaku #erau2026 #budayakaltim", notes: "5 slide, cover sudah approved.", createdAt: "2026-09-05", updatedAt: "2026-09-11", tone: "from-sky-100 to-indigo-50 dark:from-sky-950 dark:to-zinc-900", slides: 5 },
  { id: "c4", title: "Ekowisata Mangrove Balikpapan", type: "reels", status: "draft", scheduledDate: "2026-09-17", scheduledTime: "15:00", pic: "Nadia Putri", initials: "NP", category: "Pariwisata", caption: "Susur hutan mangrove Balikpapan, paru-paru kota yang wajib dijaga.", hashtags: "#kawaku #ekowisata #balikpapan", notes: "Draft kasar, butuh VO dan color grading.", createdAt: "2026-09-10", updatedAt: "2026-09-10", tone: "from-teal-100 to-brand-50 dark:from-teal-950 dark:to-zinc-900" },
  { id: "c5", title: "Pasar Digital UMKM Samarinda", type: "feed", status: "published", scheduledDate: "2026-09-12", scheduledTime: "10:00", pic: "Bima Pratama", initials: "BP", category: "UMKM", caption: "UMKM Samarinda naik kelas lewat pasar digital. Omzet naik 40% dalam 3 bulan!", hashtags: "#kawaku #umkm #samarinda", notes: "Sudah tayang, performa bagus.", createdAt: "2026-09-06", updatedAt: "2026-09-12", tone: "from-zinc-200 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900" },
  { id: "c6", title: "Kuliner Amplang Khas Kaltim", type: "reels", status: "published", scheduledDate: "2026-09-11", scheduledTime: "19:00", pic: "Sinta Maharani", initials: "SM", category: "Kuliner", caption: "Renyah amplang khas Kaltim, oleh-oleh wajib dari Samarinda!", hashtags: "#kawaku #kulinerkaltim #amplang", notes: "Top performer minggu ini.", createdAt: "2026-09-04", updatedAt: "2026-09-11", tone: "from-orange-100 to-amber-50 dark:from-orange-950 dark:to-zinc-900" },
  { id: "c7", title: "Profil Pengrajin Ulap Doyo", type: "carousel", status: "revision", scheduledDate: "2026-09-18", scheduledTime: "11:00", pic: "Nadia Putri", initials: "NP", category: "Budaya", caption: "Kain Ulap Doyo, warisan Benuaq yang ditenun dengan kesabaran.", hashtags: "#kawaku #ulapdoyo #wastra", notes: "Revisi: ganti foto slide 2 yang blur, perbaiki typo slide 4.", createdAt: "2026-09-07", updatedAt: "2026-09-13", tone: "from-rose-100 to-pink-50 dark:from-rose-950 dark:to-zinc-900", slides: 4 },
  { id: "c8", title: "Rute Wisata Susur Mahakam", type: "story", status: "idea", scheduledDate: "2026-09-20", scheduledTime: "08:00", pic: "Daffa Wijaya", initials: "DW", category: "Pariwisata", caption: "Polling: sunrise vs sunset di Mahakam?", hashtags: "#kawaku #mahakam", notes: "Baru ide, butuh footage perahu.", createdAt: "2026-09-13", updatedAt: "2026-09-13", tone: "from-cyan-100 to-sky-50 dark:from-cyan-950 dark:to-zinc-900" },
  { id: "c9", title: "Behind the Scene Liputan Erau", type: "story", status: "approved", scheduledDate: "2026-09-16", scheduledTime: "18:00", pic: "Rizky Ramadhan", initials: "RR", category: "Budaya", caption: "Keseruan tim di lapangan selama liputan Erau!", hashtags: "#kawaku #bts #erau2026", notes: "Approved, tinggal dijadwalkan.", createdAt: "2026-09-09", updatedAt: "2026-09-12", tone: "from-violet-100 to-purple-50 dark:from-violet-950 dark:to-zinc-900" },
  { id: "c10", title: "Tips Foto Produk UMKM", type: "carousel", status: "draft", scheduledDate: "2026-09-19", scheduledTime: "14:00", pic: "Nadia Putri", initials: "NP", category: "UMKM", caption: "Cukup dengan HP, foto produk UMKM bisa terlihat profesional. Ini caranya.", hashtags: "#kawaku #tipsumkm", notes: "Draft 3 slide, tambah 2 slide contoh before-after.", createdAt: "2026-09-11", updatedAt: "2026-09-11", tone: "from-lime-100 to-brand-50 dark:from-lime-950 dark:to-zinc-900", slides: 3 },
  { id: "c11", title: "Panorama Danau Labuan Cermin", type: "feed", status: "published", scheduledDate: "2026-08-22", scheduledTime: "10:00", pic: "Rizky Ramadhan", initials: "RR", category: "Pariwisata", caption: "Danau dua rasa di Berau — air tawar di atas, air asin di bawah. Magis!", hashtags: "#kawaku #labuancermin #berau", notes: "Sudah tayang.", createdAt: "2026-08-16", updatedAt: "2026-08-22", tone: "from-cyan-100 to-teal-50 dark:from-cyan-950 dark:to-zinc-900" },
  { id: "c12", title: "Festival Kuliner Tepian Mahakam", type: "carousel", status: "published", scheduledDate: "2026-08-29", scheduledTime: "16:00", pic: "Sinta Maharani", initials: "SM", category: "Kuliner", caption: "7 jajanan wajib di Festival Kuliner Tepian Mahakam. Nomor 4 bikin antre!", hashtags: "#kawaku #kulinerkaltim #festivalkuliner", notes: "Sudah tayang, 4 slide.", createdAt: "2026-08-21", updatedAt: "2026-08-29", tone: "from-orange-100 to-rose-50 dark:from-orange-950 dark:to-zinc-900", slides: 4 },
  { id: "c13", title: "Kampung Tenun Samarinda", type: "reels", status: "published", scheduledDate: "2026-09-03", scheduledTime: "19:00", pic: "Nadia Putri", initials: "NP", category: "Budaya", caption: "Menjelajah Kampung Tenun Samarinda, rumah sarung legendaris Kalimantan.", hashtags: "#kawaku #tenunsamarinda #wastra", notes: "Sudah tayang.", createdAt: "2026-08-27", updatedAt: "2026-09-03", tone: "from-fuchsia-100 to-purple-50 dark:from-fuchsia-950 dark:to-zinc-900" },
];

// Urutan workflow status + transisi yang diizinkan (maju & mundur wajar saja)
export const statusFlow: ContentStatus[] = [
  "idea",
  "draft",
  "review",
  "revision",
  "approved",
  "scheduled",
  "published",
];

export const statusTransitions: Record<ContentStatus, ContentStatus[]> = {
  idea: ["draft"],
  draft: ["review", "idea"],
  review: ["approved", "revision", "draft"],
  revision: ["review", "draft"],
  approved: ["scheduled", "review"],
  scheduled: ["published", "approved"],
  published: [],
};

export const transitionLabels: Record<string, string> = {
  "idea->draft": "Save as Draft",
  "draft->idea": "Back to Idea",
  "draft->review": "Submit for Review",
  "review->draft": "Back to Draft",
  "review->approved": "Approve",
  "review->revision": "Return for Revision",
  "revision->review": "Resubmit for Review",
  "revision->draft": "Back to Draft",
  "approved->review": "Back to Review",
  "approved->scheduled": "Mark as Scheduled",
  "scheduled->approved": "Back to Approved",
  "scheduled->published": "Mark as Published",
};

export type HistoryEntry = { status: ContentStatus; at: string; by: string };
export type Comment = { id: string; author: string; text: string; at: string };

// Timeline mock: dibuat dari status saat ini (diganti backend nanti)
export function buildHistory(c: ManagedContent): HistoryEntry[] {
  const order: ContentStatus[] = ["idea", "draft", "review"];
  if (c.status === "revision") order.push("revision");
  if (c.status === "approved" || c.status === "scheduled" || c.status === "published")
    order.push("approved");
  if (c.status === "scheduled" || c.status === "published") order.push("scheduled");
  if (c.status === "published") order.push("published");
  const base = new Date(`${c.createdAt}T09:00:00`);
  return order.map((s, i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { status: s, at: i === order.length - 1 ? c.updatedAt : iso, by: i === 0 ? c.pic : "Daffa Wijaya" };
  });
}

export const seedComments: Record<string, Comment[]> = {  c2: [
    { id: "cm1", author: "Daffa Wijaya", text: "Foto hero slide 1 kurang tajam, minta versi resolusi penuh ke tim lapangan ya.", at: "2026-09-13" },
  ],
  c7: [
    { id: "cm2", author: "Daffa Wijaya", text: "Dikembalikan: foto slide 2 blur dan ada typo di slide 4 (\"Benuaq\" tertulis \"Benua\").", at: "2026-09-13" },
    { id: "cm3", author: "Nadia Putri", text: "Siap, revisi foto dan typo hari ini. Minta review ulang besok pagi.", at: "2026-09-13" },
  ],
  c3: [
    { id: "cm4", author: "Daffa Wijaya", text: "Approved. Cover kuat, caption sudah sesuai tone KAWAKU.", at: "2026-09-11" },
  ],
};

// ---------- Analytics mock (konsisten dengan contentLibrary, diganti backend nanti) ----------
export type DayMetric = {
  date: string; // YYYY-MM-DD
  reach: number;
  impressions: number;
  engagement: number;
};

export type ContentMetric = {
  reach: number;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
};

// Deret harian deterministik 60 hari terakhir (17 Jul – 14 Sep 2026)
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const analyticsDaily: DayMetric[] = (() => {
  const rand = mulberry32(42);
  const end = new Date(2026, 8, 14);
  const out: DayMetric[] = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const growth = 1 + ((59 - i) / 59) * 0.9; // tren naik ~90% selama 60 hari
    const base = 6200 * growth * (weekend ? 1.35 : 1);
    const reach = Math.round(base * (0.85 + rand() * 0.3));
    const impressions = Math.round(reach * (1.5 + rand() * 0.3));
    const engagement = Math.round(reach * (0.055 + rand() * 0.02));
    out.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      reach,
      impressions,
      engagement,
    });
  }
  return out;
})();

export const contentMetrics: Record<string, ContentMetric> = {
  c5: { reach: 48200, impressions: 76400, likes: 3150, comments: 214, shares: 386, saves: 512, views: 96400 },
  c6: { reach: 86400, impressions: 141200, likes: 6230, comments: 418, shares: 905, saves: 1240, views: 172800 },
  c11: { reach: 35800, impressions: 54900, likes: 2210, comments: 156, shares: 248, saves: 331, views: 68900 },
  c12: { reach: 52700, impressions: 84600, likes: 3840, comments: 267, shares: 492, saves: 618, views: 105300 },
  c13: { reach: 61900, impressions: 98300, likes: 4470, comments: 305, shares: 571, saves: 704, views: 121700 },
};

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
  usedBy: string[]; // id konten di contentLibrary
  driveFileId: string; // placeholder — siap diisi Google Drive file id
};

export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200 MB

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const mediaLibrary: MediaAsset[] = [
  { id: "m1", name: "panen-raya-cover.jpg", kind: "image", type: "reels", sizeLabel: "2.4 MB", sizeBytes: 2516582, uploadedAt: "2026-09-10", uploadedBy: "Sinta Maharani", tone: "from-brand-100 to-teal-50 dark:from-brand-950 dark:to-zinc-900", usedBy: ["c1"], driveFileId: "drive_mock_m1" },
  { id: "m2", name: "panen-raya-teaser.mp4", kind: "video", type: "reels", sizeLabel: "48.2 MB", sizeBytes: 50541363, duration: "00:45", uploadedAt: "2026-09-10", uploadedBy: "Sinta Maharani", tone: "from-brand-100 to-teal-50 dark:from-brand-950 dark:to-zinc-900", usedBy: ["c1"], driveFileId: "drive_mock_m2" },
  { id: "m3", name: "kopi-mahakam-flatlay.jpg", kind: "image", type: "feed", sizeLabel: "3.1 MB", sizeBytes: 3250586, uploadedAt: "2026-09-09", uploadedBy: "Bima Pratama", tone: "from-amber-100 to-orange-50 dark:from-amber-950 dark:to-zinc-900", usedBy: ["c2"], driveFileId: "drive_mock_m3" },
  { id: "m4", name: "erau-pembuka.jpg", kind: "image", type: "carousel", sizeLabel: "1.8 MB", sizeBytes: 1887437, uploadedAt: "2026-09-08", uploadedBy: "Daffa Wijaya", tone: "from-sky-100 to-indigo-50 dark:from-sky-950 dark:to-zinc-900", usedBy: ["c3", "c9"], driveFileId: "drive_mock_m4" },
  { id: "m5", name: "erau-tari-hudoq.jpg", kind: "image", type: "carousel", sizeLabel: "2.2 MB", sizeBytes: 2306867, uploadedAt: "2026-09-08", uploadedBy: "Daffa Wijaya", tone: "from-sky-100 to-indigo-50 dark:from-sky-950 dark:to-zinc-900", usedBy: ["c3"], driveFileId: "drive_mock_m5" },
  { id: "m6", name: "mangrove-drone.mp4", kind: "video", type: "reels", sizeLabel: "120.5 MB", sizeBytes: 126353408, duration: "02:10", uploadedAt: "2026-09-05", uploadedBy: "Nadia Putri", tone: "from-teal-100 to-brand-50 dark:from-teal-950 dark:to-zinc-900", usedBy: ["c4"], driveFileId: "drive_mock_m6" },
  { id: "m7", name: "pasar-digital-samarinda.jpg", kind: "image", type: "feed", sizeLabel: "2.9 MB", sizeBytes: 3040870, uploadedAt: "2026-09-11", uploadedBy: "Bima Pratama", tone: "from-zinc-200 to-zinc-50 dark:from-zinc-800 dark:to-zinc-900", usedBy: ["c5"], driveFileId: "drive_mock_m7" },
  { id: "m8", name: "amplang-proses.mp4", kind: "video", type: "reels", sizeLabel: "64.0 MB", sizeBytes: 67108864, duration: "01:05", uploadedAt: "2026-08-28", uploadedBy: "Sinta Maharani", tone: "from-orange-100 to-amber-50 dark:from-orange-950 dark:to-zinc-900", usedBy: ["c6"], driveFileId: "drive_mock_m8" },
  { id: "m9", name: "ulap-doyo-tenun.jpg", kind: "image", type: "carousel", sizeLabel: "4.2 MB", sizeBytes: 4404019, uploadedAt: "2026-09-06", uploadedBy: "Nadia Putri", tone: "from-rose-100 to-pink-50 dark:from-rose-950 dark:to-zinc-900", usedBy: ["c7"], driveFileId: "drive_mock_m9" },
  { id: "m10", name: "mahakam-sunset.mp4", kind: "video", type: "story", sizeLabel: "18.7 MB", sizeBytes: 19608371, duration: "00:15", uploadedAt: "2026-09-12", uploadedBy: "Daffa Wijaya", tone: "from-cyan-100 to-sky-50 dark:from-cyan-950 dark:to-zinc-900", usedBy: ["c8"], driveFileId: "drive_mock_m10" },
  { id: "m11", name: "bts-erau-tim.jpg", kind: "image", type: "story", sizeLabel: "1.5 MB", sizeBytes: 1572864, uploadedAt: "2026-09-13", uploadedBy: "Rizky Ramadhan", tone: "from-violet-100 to-purple-50 dark:from-violet-950 dark:to-zinc-900", usedBy: ["c9"], driveFileId: "drive_mock_m11" },
  { id: "m12", name: "foto-produk-hp.jpg", kind: "image", type: "carousel", sizeLabel: "2.0 MB", sizeBytes: 2097152, uploadedAt: "2026-07-30", uploadedBy: "Nadia Putri", tone: "from-lime-100 to-brand-50 dark:from-lime-950 dark:to-zinc-900", usedBy: ["c10"], driveFileId: "drive_mock_m12" },
];
