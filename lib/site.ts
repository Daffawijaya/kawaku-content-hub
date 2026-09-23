// Satu pintu identitas situs utk SEO (canonical, sitemap, OG, JSON-LD).
// Domain produksi via NEXT_PUBLIC_SITE_URL; default = Vercel project ini.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://kawaku-content-hub.vercel.app"
).replace(/\/+$/, "");

export const SITE_NAME = "KAWAKU Content Hub";
export const SITE_SHORT = "KAWAKU";
export const IG_URL = "https://instagram.com/kawaku.kukar";
export const IG_HANDLE = "@kawaku.kukar";

export const SITE_DESCRIPTION =
  "KAWAKU Content Hub — hub konten kreator UMKM Kutai Kartanegara: kalender konten, media, analitik, dan Instagram @kawaku.kukar dalam satu tempat.";

export const SITE_KEYWORDS = [
  "kawaku",
  "kawaku content hub",
  "kawaku kukar",
  "UMKM Kutai Kartanegara",
  "kreator Tenggarong",
  "konten Kutai Kartanegara",
  "pariwisata Kutai Kartanegara",
  "budaya Kutai Kartanegara",
  "kuliner Tenggarong",
  "instagram kawaku",
];
