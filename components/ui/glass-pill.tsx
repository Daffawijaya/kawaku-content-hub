import { ChevronDown } from "lucide-react";
import Link from "next/link";

// Satu-satunya sumber style pill kaca abu (disalin dari
// analytics-dashboard button "Tampilkan analitik lengkap").
// Visual inti sama persis; layout (margin/centering) diatur di pemakai.
// NOTE: jangan gabung via cn()/twMerge — twMerge menganggap
// bg-gradient-to-b vs bg-zinc-900/[0.05] konflik dan membuang gradientnya.
export const glassPillVisual =
  "flex h-9 w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-b from-white/30 to-white/0 bg-zinc-900/[0.05] px-4 text-sm font-medium text-zinc-900 backdrop-blur-md hover:bg-zinc-900/10 dark:from-white/[0.07] dark:to-white/0 dark:bg-white/10 dark:text-white dark:hover:bg-white/20";

// Varian light-only untuk halaman yang selalu terang (landing page di atas
// bg gambar terang): token dark: dibuang agar tombol tidak ikut gelap saat
// sistem/dark mode aktif dan tetap terbaca.
export const glassPillVisualLight = glassPillVisual
  .split(" ")
  .filter((t) => !t.startsWith("dark:"))
  .join(" ");

export function GlassPillLink({
  href,
  children,
  className,
  forceLight,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  forceLight?: boolean;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${forceLight ? glassPillVisualLight : glassPillVisual}${className ? ` ${className}` : ""}`}
    >
      {children}
      <ChevronDown className="h-4 w-4" />
    </Link>
  );
}
