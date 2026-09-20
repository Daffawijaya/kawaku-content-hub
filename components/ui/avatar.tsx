"use client";

import { cn } from "@/lib/utils";

// Avatar lingkaran: foto bila ada (gagal load → sembunyi, inisial di
// bawahnya tampil), kalau tidak ya inisial seperti sebelumnya.
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
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}
    </span>
  );
}
