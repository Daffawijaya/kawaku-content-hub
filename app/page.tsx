import Link from "next/link";
import { User, Settings } from "lucide-react";

export default function LandingPage() {
  const cards = [
    { src: "/tim/anggi.png", bg: "bg-red-500", rotate: "-rotate-[12deg]", z: "z-10" },
    { src: "/tim/daffa2.png", bg: "bg-blue-500", rotate: "-rotate-[8deg]", z: "z-20" },
    { src: "/tim/denta.png", bg: "bg-yellow-400", rotate: "-rotate-[4deg]", z: "z-30" },
    { src: "/tim/dilla.png", bg: "bg-pink-300", rotate: "rotate-0", z: "z-40" },
    { src: "/tim/dimas.png", bg: "bg-red-800", rotate: "rotate-[4deg]", z: "z-50" },
    { src: "/tim/fadoli.png", bg: "bg-red-600", rotate: "rotate-[8deg]", z: "z-60" },
    { src: "/tim/faruq2.png", bg: "bg-green-700", rotate: "rotate-[12deg]", z: "z-70" },
  ];

  return (
    <div className="min-h-screen bg-[#F9F9F9] text-zinc-900">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-teal-400 rounded-sm" />
          <span className="font-bold text-xl">Pallet Ross</span>
        </div>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <Link href="#">Get Started</Link>
          <Link href="#">Create strategy</Link>
          <Link href="#">Pricing</Link>
          <Link href="#">Contact</Link>
          <Link href="#">Solution</Link>
          <Link href="#">E-Commerce</Link>
        </nav>
        <div className="flex items-center gap-4">
          <User className="h-5 w-5" />
          <Settings className="h-5 w-5" />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-col items-center pt-20">
        <h1 className="text-6xl font-semibold tracking-tighter text-center max-w-3xl">
          A place to display your masterpiece.
        </h1>
        
        {/* Layered Cards */}
        <div className="relative mt-24 h-64 w-full max-w-4xl flex justify-center items-center">
            {cards.map((card, i) => (
                <div 
                    key={i} 
                    className={`h-48 w-48 ${card.bg} rounded-2xl ${card.rotate} ${card.z} absolute shadow-xl overflow-hidden`}
                    style={{ left: `calc(50% - 96px + ${(i - 3) * 130}px)` }}
                >
                  <img src={card.src} alt="Team Member" className="h-full w-full object-cover object-top translate-y-4" />
                </div>
            ))}
        </div>

        {/* Description & CTA */}
        <p className="mt-16 text-center text-zinc-600 max-w-md">
          Artists can display their masterpieces, and buyers can discover and purchase works that resonate with them.
        </p>

        <div className="mt-8 flex gap-4">
          <button className="bg-zinc-900 text-white px-6 py-3 rounded-full font-medium">
            Join for $9.99/m
          </button>
          <button className="bg-white border border-zinc-200 px-6 py-3 rounded-full font-medium">
            Read more
          </button>
        </div>
      </main>
    </div>
  );
}
