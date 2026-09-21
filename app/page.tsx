import Link from "next/link";
import { Source_Serif_4 } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { Countdown } from "@/components/countdown";

export const dynamic = "force-dynamic";

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["700", "900"],
});

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

function StarBurst({ className }: { className?: string }) {
  const spokes = [0, 36, 72, 108, 144].map((a) => {
    const r = (a * Math.PI) / 180;
    const x = Math.cos(r) * 44;
    const y = Math.sin(r) * 44;
    return `M${-x} ${-y}L${x} ${y}`;
  });
  return (
    <svg viewBox="-50 -50 100 100" fill="none" aria-hidden="true" className={className}>
      {spokes.map((d) => (
        <path key={d} d={d} stroke="#ffc400" strokeWidth="13" strokeLinecap="round" />
      ))}
    </svg>
  );
}

function Squiggle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 135 70" fill="none" aria-hidden="true" className={className}>
      <path
        d="M6 56C24 12 44 10 40 38c-3 20 20 24 30 2 6-14 24-16 30 0"
        stroke="#3b5bff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M106 40L130 36" stroke="#3b5bff" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

function SunRays({ className }: { className?: string }) {
  const rays: string[] = [];
  const cx = 12;
  const cy = 92;
  [-78, -64, -50, -36, -24, -12, -2].forEach((deg, i) => {
    const r = (deg * Math.PI) / 180;
    const len = i % 2 === 0 ? 78 : 60;
    const x = cx + Math.cos(r) * len;
    const y = cy + Math.sin(r) * len;
    rays.push(`M${cx} ${cy}L${x.toFixed(1)} ${y.toFixed(1)}`);
  });
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className={className}>
      {rays.map((d) => (
        <path key={d} d={d} stroke="#141414" strokeWidth="6" strokeLinecap="round" />
      ))}
    </svg>
  );
}

export default function LandingPage() {
  const [mainPhoto, pinkPhoto, bluePhoto] = pickThree();

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-[#0b1533]">
      <Navbar />

      <main
        id="contact"
        className="relative mx-auto grid w-full max-w-[1440px] grid-cols-1 items-center gap-8 px-6 pb-12 pt-8 md:px-10 lg:h-[calc(100vh-72px)] lg:grid-cols-[44%_56%] lg:gap-0 lg:pb-0 lg:pt-0"
      >
        <section aria-label="Tentang acara" className="relative z-10 lg:pl-2">
          <div id="presentation">
            <p className="text-[20px] font-medium text-[#0b1533] md:text-[24px]">
              Design Summit:
            </p>
            <h1
              className={`${serif.className} mt-1 text-[clamp(3rem,7vw,6.2rem)] font-black leading-[0.98] tracking-[-0.01em]`}
            >
              <span className="block text-[#0b1533]">Unleashing</span>
              <span className="block text-[#ffc400]">Creative</span>
              <span className="block text-[#ffc400]">brilliance</span>
            </h1>
          </div>

          <div id="workshops" className="mt-5">
            <p className="text-[17px] md:text-[19px]">
              <span className="font-bold text-[#0b1533]">San Francisco </span>
              <span className="font-semibold text-[#29a6dc]">March 25-27</span>
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link
                href="#schedule"
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

          <div id="schedule" className="mt-8">
            <Countdown serif={serif.className} />
          </div>
        </section>

        <section
          id="speakers"
          aria-label="Pembicara"
          className="relative h-[480px] sm:h-[560px] lg:h-[calc(100vh-72px)]"
        >
          <StarBurst className="absolute left-[2%] top-[1%] w-12 sm:w-16 lg:w-20" />
          <Squiggle className="absolute left-[0%] top-[24%] w-28 sm:w-36 lg:w-44" />
          <StarBurst className="absolute bottom-[10%] left-[22%] w-6 sm:w-8" />
          <SunRays className="absolute bottom-[2%] left-[44%] w-20 sm:w-24 lg:w-28" />

          <div className="absolute left-[27%] top-[7%] h-[80%] w-[38%] overflow-hidden rounded-full bg-[#ffc400] sm:left-[28%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/tim/${mainPhoto}`}
              alt={`Foto ${prettyName(mainPhoto)}`}
              className="h-full w-full object-cover object-top"
            />
          </div>
          <div className="absolute right-[4%] top-[-21%] h-[62%] w-[26%] overflow-hidden rounded-full bg-[#e93aa4]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/tim/${pinkPhoto}`}
              alt={`Foto ${prettyName(pinkPhoto)}`}
              className="h-full w-full object-cover object-top"
            />
          </div>
          <div className="absolute bottom-[5%] right-[5%] h-[50%] w-[26%] overflow-hidden rounded-full bg-[#29a6dc]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/tim/${bluePhoto}`}
              alt={`Foto ${prettyName(bluePhoto)}`}
              className="h-full w-full object-cover object-top"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
