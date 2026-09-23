import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Halaman app di balik login tak bisa di-crawl (proxy mengalihkan ke
// /login) — tegaskan lewat robots agar budget crawl fokus ke publik.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/content",
          "/calendar",
          "/analytics",
          "/media",
          "/team",
          "/settings",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
