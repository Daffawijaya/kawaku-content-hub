"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Avatar lingkaran: foto fade-in halus di atas inisial (gagal load →
// sembunyi, inisial di bawahnya tampil), kalau tidak ya inisial saja.
export function AvatarPhoto({
  name,
  fallback,
  url,
  className,
}: {
  name: string;
  fallback: string;
  url?: string | null;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
  }, [url]);
  return (
    <span
      title={name}
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        className
      )}
    >
      <span aria-hidden="true">{fallback}</span>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt=""
          loading="lazy"
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth > 0) setLoaded(true);
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-500",
            loaded ? "opacity-100" : "opacity-0"
          )}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}
