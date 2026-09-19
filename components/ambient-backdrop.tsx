"use client";

import { useEffect, useRef, type RefObject } from "react";

// =====================================================================
// GLOW AMBIENT — satu file mandiri. Edit angka di CONFIG sesukamu.
// Dipakai di halaman detail konten: <AmbientBackdrop imageUrl={...} />
// =====================================================================
const CONFIG = {
  scale: 2.5, // ukuran glow thd gambar (2.5 = 250%)
  blurPx: 120, // ketajaman blur (px, makin kecil makin tajam)
  opacity: 0.25, // transparansi 0–1
  saturate: 1.5, // kejenuhan warna
  maxWidthVw: "calc(100vw - 3rem)", // batas lebar agar tak kepotong layar
  fade: "", // cth: "radial-gradient(closest-side,black_55%,transparent_78%)" atau "" bila tegas
} as const;

export function AmbientBackdrop({
  imageUrl,
  videoUrl,
  poster,
  heroVideoRef,
}: {
  imageUrl?: string | null;
  videoUrl?: string | null;
  poster?: string | null;
  // Ref ke <video> hero — glow ngikut play/pause/seek otomatis.
  heroVideoRef?: RefObject<HTMLVideoElement | null>;
}) {
  const ambientRef = useRef<HTMLVideoElement | null>(null);

  // Mirror: ambient ngikut hero (play/pause/seek + koreksi drift).
  useEffect(() => {
    const hero = heroVideoRef?.current;
    const ambient = ambientRef.current;
    if (!hero || !ambient) return;
    const syncTime = () => {
      try {
        if (Math.abs(ambient.currentTime - hero.currentTime) > 0.5) {
          ambient.currentTime = hero.currentTime;
        }
      } catch {
        /* metadata ambient belum siap */
      }
    };
    const onPlay = () => {
      syncTime();
      ambient.playbackRate = hero.playbackRate;
      void ambient.play().catch(() => undefined);
    };
    const onPause = () => void ambient.pause();
    hero.addEventListener("play", onPlay);
    hero.addEventListener("pause", onPause);
    hero.addEventListener("seeked", syncTime);
    hero.addEventListener("timeupdate", syncTime);
    return () => {
      hero.removeEventListener("play", onPlay);
      hero.removeEventListener("pause", onPause);
      hero.removeEventListener("seeked", syncTime);
      hero.removeEventListener("timeupdate", syncTime);
    };
  }, [heroVideoRef, videoUrl]);

  if (!imageUrl && !videoUrl) return null;
  // Angka CONFIG via inline style (class Tailwind dinamis tak ke-generate).
  const mediaStyle = {
    height: `${CONFIG.scale * 100}%`,
    width: `${CONFIG.scale * 100}%`,
    maxWidth: CONFIG.maxWidthVw,
    filter: `blur(${CONFIG.blurPx}px) saturate(${CONFIG.saturate})`,
    opacity: CONFIG.opacity,
  } as const;
  const mediaCls =
    "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-cover";
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-visible"
      style={CONFIG.fade ? { maskImage: CONFIG.fade } : undefined}
    >
      {videoUrl ? (
        <video
          ref={ambientRef}
          src={videoUrl}
          poster={poster ?? undefined}
          muted
          loop
          playsInline
          preload="metadata"
          className={mediaCls}
          style={mediaStyle}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl ?? ""} alt="" className={mediaCls} style={mediaStyle} />
      )}
    </div>
  );
}
