import Image from "next/image";
import { GlassPillLink } from "@/components/ui/glass-pill";

// Design Read: banner full-bleed untuk kreator UMKM Kutai Kartanegara,
// berbahasa logo raksasa plus aksen miring mengikuti referensi,
// dial ENERGY 3 / RHYTHM 1 / MOTION 1.
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#101014]";

export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#eef0f4] text-[#101014]">
      {/* BG natural tanpa scrim putih apapun. */}
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src="/kawaku-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center px-6 py-16 md:px-10">
        <h1 className="max-w-3xl text-[clamp(4rem,11vw,9rem)] font-extrabold lowercase leading-[0.95] tracking-[-0.03em] text-[#101014]">
          kawaku
          <span className="mt-2 block text-[clamp(1.25rem,3vw,2rem)] font-bold uppercase tracking-[0.35em]">
            content hub
          </span>
        </h1>
        <p className="mt-4 text-brand-600 text-[clamp(1.75rem,4.5vw,3.25rem)] font-extrabold italic leading-tight">
          untuk UMKM Kutai Kartanegara.
        </p>
        <GlassPillLink
          href="https://instagram.com/kawaku.kukar"
          forceLight
          className={`mt-6 ${FOCUS}`}
        >
          kunjungi instagram kawaku
        </GlassPillLink>
      </main>

      <footer className="relative z-10 px-6 pb-5 md:px-10">
        <p className="text-[12px] font-medium text-[#101014]/60">
          tim kawaku, kutai kartanegara
        </p>
      </footer>
    </div>
  );
}
