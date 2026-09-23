import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_SHORT } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_SHORT,
    description:
      "Hub konten kreator UMKM Kutai Kartanegara: kalender, media, dan analitik.",
    start_url: "/",
    display: "standalone",
    background_color: "#eef0f4",
    theme_color: "#101014",
    icons: [
      { src: "/icon.png", sizes: "any", type: "image/png" },
      { src: "/kawaku-avatar.jpg", sizes: "1080x1080", type: "image/jpeg" },
    ],
  };
}
