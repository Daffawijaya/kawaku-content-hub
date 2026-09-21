import Image from "next/image";
import Link from "next/link";
import { GlassPillLink } from "@/components/ui/glass-pill";
import { getSessionProfile } from "@/lib/supabase/server";

// Design Read: banner full-bleed untuk kreator UMKM Kutai Kartanegara,
// berbahasa logo raksasa plus aksen miring mengikuti referensi,
// dial ENERGY 3 / RHYTHM 1 / MOTION 1.
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#101014]";

export default async function LandingPage() {
  const session = await getSessionProfile();
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

      {/* Navbar transparan di atas: logo kiri disalin dari navbar dashboard,
          tombol kanan se-style button IG (masuk bila belum login). */}
      <header className="absolute inset-x-0 top-0 z-20 bg-transparent">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between px-6 md:px-10">
          <Link href="/" aria-label="kawaku home" className={`flex min-w-0 items-center gap-2 ${FOCUS}`}>
            <Image src="/kawaky.png" alt="KAWAKU" width={24} height={34} className="h-6 w-auto shrink-0" />
            <Image src="/kawakutext.png" alt="KAWAKU" width={96} height={20} className="hidden h-4 w-auto min-[400px]:block" />
          </Link>
          <GlassPillLink
            href={session ? "/dashboard" : "/login"}
            tone="solid"
            className={FOCUS}
          >
            {session ? "Dashboard" : "Masuk"}
          </GlassPillLink>
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-1 flex-col justify-center px-6 py-16 md:px-10">
        <h1 className="max-w-3xl text-[clamp(4rem,11vw,9rem)] font-extrabold lowercase leading-[0.95] tracking-[-0.03em] text-[#101014]">
          kawaku
          <span className="mt-2 block text-[clamp(1.25rem,3vw,2rem)] font-bold uppercase tracking-[0.35em]">
            content hub
          </span>
        </h1>
        <GlassPillLink
          href="https://instagram.com/kawaku.kukar"
          tone="solid"
          external
          className={`mt-6 ${FOCUS}`}
        >
          Kunjungi instagram kawaku
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
