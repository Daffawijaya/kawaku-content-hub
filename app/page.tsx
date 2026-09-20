import { InstagramCommand } from "@/components/instagram-command";

// BG ungu dari /public (nama file berisi spasi → di-encode).
const BG = "/ChatGPT%20Image%20Sep%2020,%202026,%2004_42_08%20PM.png";
const IG_URL = "https://instagram.com/kawaku.kukar";

export default async function LandingPage() {
  return (
    <div className="relative h-screen overflow-hidden bg-[#14101f] text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={BG} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />

      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col px-4">
        <header className="flex items-center justify-between py-6">
          <p className="text-xl font-bold tracking-tight">kawaku</p>
          <div className="flex items-center gap-3 sm:gap-6">
            <a
              href="/login"
              className="text-[13px] font-medium text-white/70 hover:text-white sm:text-[15px]"
            >
              Masuk
            </a>
            <a
              href={IG_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[13px] font-medium backdrop-blur-md hover:bg-white/20 sm:text-[15px]"
            >
              Lihat Instagram
            </a>
          </div>
        </header>

        <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden py-10">
          <div className="flex flex-col justify-center text-center">
            <h1 className="mx-auto max-w-5xl text-[clamp(2rem,3.75vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
              Karya Wirausaha dan Ekonomi Kreatif Kutai Kartanegara
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-[clamp(0.875rem,1.1vw,1.125rem)] leading-snug text-white/90">
              Edukasi, inspirasi, dan info seputar UMKM.
            </p>
            <InstagramCommand />
          </div>
        </main>

        <p className="pb-8 text-center text-[15px] text-white/70">
          © 2026 kawaku
        </p>
      </div>
    </div>
  );
}
