"use client";

import type { RefObject } from "react";

// Glow ambient ala YouTube: berjangkar di titik tengah hero (center = center
// media), melebar lalu fade radial. Murni mirror: tidak autoplay sendiri,
// play/pause/seek dikendalikan dari video hero oleh pemanggil via videoRef.
export function AmbientBackdrop({
  imageUrl,
  videoUrl,
  poster,
  videoRef,
}: {
  imageUrl?: string | null;
  videoUrl?: string | null;
  poster?: string | null;
  videoRef?: RefObject<HTMLVideoElement | null>;
}) {

  if (!imageUrl && !videoUrl) return null;
  // % thd wrapper (== ukuran media) → rasio selalu sama dgn media.
  // Lebar dibatasi viewport agar pelebaran selalu kelihatan penuh.
  const mediaCls =
    "absolute left-1/2 top-1/2 h-[150%] w-[150%] max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 object-cover blur-[120px] saturate-150 opacity-10";
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-visible">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={poster ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          className={mediaCls}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl ?? ""} alt="" className={mediaCls} />
      )}
    </div>
  );
}
