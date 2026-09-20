import Link from "next/link";
import type { ProfileFeed } from "@/app/api/instagram/profile-feed/route";

async function getFeed(): Promise<ProfileFeed> {
  // Menggunakan URL absolut untuk fetch server-side
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/instagram/profile-feed`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Gagal memuat feed Instagram");
  return res.json();
}

export default async function LandingPage() {
  let feed: ProfileFeed | null = null;
  try {
    feed = await getFeed();
  } catch (e) {
    console.error(e);
  }

  // Fallback jika feed gagal atau kosong
  const tiles = feed?.tiles?.slice(0, 7) || [];

  return (
    <div className="flex h-screen flex-col bg-[#F9F9F9] text-zinc-900 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-teal-400 rounded-sm" />
          <span className="font-bold text-xl">Pallet Ross</span>
        </div>
      </header>

      {/* Hero Section - Flex container to center and space elements tightly */}
      <main className="flex flex-1 flex-col items-center justify-center gap-8 overflow-hidden pb-8">
        <h1 className="max-w-3xl text-center text-5xl font-semibold tracking-tighter">
          Karya Wirausaha dan Ekonomi Kreatif Kutai Kartanegara
        </h1>
        
        {/* Layered Cards - Back to larger size */}
        <div className="relative h-48 w-full max-w-6xl flex justify-center items-center">
            {tiles.length > 0 ? (
                tiles.map((tile, i) => (
                    <div 
                        key={i} 
                        className={`h-48 w-48 rounded-lg ${
                            i === 0 ? "-rotate-[12deg] z-10" :
                            i === 1 ? "-rotate-[8deg] z-20" :
                            i === 2 ? "-rotate-[4deg] z-30" :
                            i === 3 ? "rotate-0 z-40" :
                            i === 4 ? "rotate-[4deg] z-50" :
                            i === 5 ? "rotate-[8deg] z-60" :
                            "rotate-[12deg] z-70"
                        } absolute shadow-xl overflow-hidden`}
                        style={{ left: `calc(50% - 96px + ${(i - 3) * 160}px)` }}
                    >
                      <img src={tile.src} alt="Instagram Post" className="h-full w-full object-cover" />
                    </div>
                ))
            ) : (
                <p>Tidak ada konten Instagram.</p>
            )}
        </div>

        {/* Description & CTA */}
        <p className="text-center text-zinc-600 max-w-md">
          Edukasi | Inspirasi | Info Seputar UMKM
        </p>

        <div className="flex gap-4">
          <button className="bg-zinc-900 text-white px-6 py-2.5 rounded-full font-medium">
            Join for $9.99/m
          </button>
          <button className="bg-white border border-zinc-200 px-6 py-2.5 rounded-full font-medium">
            Read more
          </button>
        </div>
      </main>
    </div>
  );
}
