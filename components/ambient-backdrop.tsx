"use client";

import { useEffect, useRef } from "react";

// Backdrop ambient ala YouTube: media yg sama dgn hero, diperbesar + blur,
// fixed di belakang seluruh shell (konten, navbar, sidebar).
export function AmbientBackdrop({
  imageUrl,
  videoUrl,
  poster,
}: {
  imageUrl?: string | null;
  videoUrl?: string | null;
  poster?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Hemat baterai/CPU: pause mirror saat tab disembunyikan.
  useEffect(() => {
    if (!videoUrl) return;
    const onVis = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) void v.pause();
      else void v.play().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [videoUrl]);

  const mediaCls =
    "absolute inset-0 h-full w-full scale-125 object-cover blur-3xl saturate-150";
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={poster ?? undefined}
          muted
          loop
          playsInline
          autoPlay
          preload="metadata"
          className={mediaCls}
        />
      ) : imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className={mediaCls} />
      ) : null}
      {/* Redam utk keterbacaan + fade bawah ke bg body */}
      <div className="absolute inset-0 bg-white/60 dark:bg-black/60" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#fafafa] dark:to-[#09090b]" />
    </div>
  );
}
