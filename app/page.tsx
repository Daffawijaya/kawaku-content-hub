import Link from "next/link";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

const TEAM_PHOTOS = [
  "anggi.png",
  "daffa2.png",
  "denta.png",
  "dilla.png",
  "dimas.png",
  "fadoli.png",
  "faruq2.png",
  "feron.png",
  "fikri.png",
  "henson.png",
  "kia2.png",
  "latifah.png",
  "lidya.png",
  "mase.png",
  "mega.png",
  "miftah.png",
  "ozi2.png",
  "riri2.png",
  "siswanto.png",
  "tita2.png",
];

function prettyName(file: string): string {
  const base = file.replace(/\.png$/, "").replace(/[0-9]+$/, "");
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function pickThree(): [string, string, string] {
  const pool = [...TEAM_PHOTOS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [pool[0], pool[1], pool[2]];
}

export default function LandingPage() {
  const [mainPhoto, pinkPhoto, bluePhoto] = pickThree();

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-[#0b1533]">
      <Navbar />

      <main
        id="contact"
        className="relative mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-8 px-6 pb-12 pt-8 md:px-10 lg:h-[calc(100vh-72px)] lg:grid-cols-[48%_52%] lg:gap-0 lg:pb-0 lg:pl-10 lg:pr-0 lg:pt-0"
      >
        <section aria-label="Tentang acara" className="relative z-10 lg:pl-2">
          <div id="presentation">
            <p className="text-[20px] font-semibold text-[#0b1533] md:text-[24px]">
              KAWAKU Content Hub
            </p>
            <h1 className="mt-2 max-w-[720px] text-[clamp(2rem,3.4vw,2.75rem)] font-extrabold leading-[1.08] tracking-[-0.02em] text-[#0b1533]">
              Karya Wirausaha dan Ekonomi Kreatif Kutai Kartanegara
            </h1>
          </div>

          <div id="workshops" className="mt-5">
            <p className="text-[17px] font-semibold text-[#0b1533] md:text-[19px]">
              Edukasi <span className="mx-1 text-[#29a6dc]">|</span> Inspirasi{" "}
              <span className="mx-1 text-[#29a6dc]">|</span> Info Seputar UMKM
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link
                href="/calendar"
                className="rounded-full bg-[#29a6dc] px-9 py-3 text-[15px] font-semibold text-white hover:bg-[#1f8fc0]"
              >
                Schedule
              </Link>
              <Link
                href="#presentation"
                className="rounded-full border-[1.5px] border-[#29a6dc] bg-white px-9 py-[10px] text-[15px] font-semibold text-[#0b1533] hover:bg-[#29a6dc]/10"
              >
                Learn more
              </Link>
            </div>
          </div>
        </section>

        <section
          id="speakers"
          aria-label="Pembicara"
          className="relative -mr-6 h-[480px] sm:h-[560px] md:-mr-10 lg:mr-0 lg:h-[calc(100vh-72px)]"
        >
          <div className="absolute left-[32%] top-[9%] h-[70%] w-[33%] overflow-hidden rounded-full bg-[#ffc400] sm:left-[33%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/tim/${mainPhoto}`}
              alt={`Foto ${prettyName(mainPhoto)}`}
              className="absolute left-1/2 top-[80%] h-[120%] w-[120%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
            />
          </div>
          <div className="absolute right-[1%] top-[-26%] h-[67%] w-[26%] overflow-hidden rounded-full bg-[#e93aa4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/tim/${pinkPhoto}`}
              alt={`Foto ${prettyName(pinkPhoto)}`}
              className="absolute left-1/2 top-[88%] h-[110%] w-[110%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
            />
          </div>
          <div className="absolute bottom-[5%] right-[1%] h-[50%] w-[26%] overflow-hidden rounded-full bg-[#29a6dc]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/tim/${bluePhoto}`}
              alt={`Foto ${prettyName(bluePhoto)}`}
              className="absolute left-1/2 top-[88%] h-[136%] w-[136%] max-w-none -translate-x-1/2 -translate-y-1/2 object-cover"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
