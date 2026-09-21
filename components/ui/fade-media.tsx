"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Gambar dgn loading halus satu pintu (dipakai seluruh aplikasi):
// shimmer denyut di belakang, fade-in opacity hanya setelah benar-benar
// keload, gagal total = fallback (atau kosong). State kereset tiap ganti src.
export function FadeImg({
  src,
  alt = "",
  className,
  imgClassName,
  fallback,
  eager,
}: {
  src?: string | null;
  alt?: string;
  // Ukuran + bentuk wadah (wajib ada dimensi, mis. h-10 w-10 / aspect-*).
  className?: string;
  imgClassName?: string;
  // Tampil di belakang gambar (ikon/inisial) dan saat gambar gagal.
  fallback?: React.ReactNode;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);
  const showImg = !!src && !failed;
  return (
    <span
      className={cn(
        "relative block overflow-hidden bg-zinc-100 dark:bg-zinc-800",
        showImg && !loaded && "animate-pulse",
        className
      )}
    >
      {fallback && (
        <span className="absolute inset-0 flex items-center justify-center">{fallback}</span>
      )}
      {showImg && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth > 0) setLoaded(true);
            else setFailed(true);
          }}
          onError={() => setFailed(true)}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0",
            imgClassName
          )}
        />
      )}
    </span>
  );
}
