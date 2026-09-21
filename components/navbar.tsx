"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "#presentation", label: "Presentation" },
  { href: "#schedule", label: "Schedule" },
  { href: "#speakers", label: "Speakers" },
  { href: "#workshops", label: "Workshops" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 pt-5 md:px-10">
      <Link href="/" className="flex min-w-0 items-center gap-2" aria-label="KAWAKU home">
        <Image src="/kawaky.png" alt="KAWAKU" width={24} height={34} className="h-6 w-auto shrink-0" />
        <Image
          src="/kawakutext.png"
          alt="KAWAKU"
          width={96}
          height={20}
          className="hidden h-4 w-auto min-[400px]:block"
        />
      </Link>

      <nav aria-label="Primary" className="hidden items-center gap-9 lg:flex">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-[14px] font-medium text-[#2b2b30] hover:text-black"
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="hidden lg:block">
        <Link
          href="#contact"
          className="rounded-full border-[1.5px] border-[#0b1533] bg-white px-6 py-2 text-[14px] font-semibold text-[#0b1533] hover:bg-[#0b1533] hover:text-white"
        >
          Contact Us
        </Link>
      </div>

      <button
        type="button"
        aria-label={open ? "Tutup menu" : "Buka menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-11 w-11 place-items-center rounded-full border-[1.5px] border-[#0b1533] text-[#0b1533] lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          {open ? (
            <path d="M3 3l12 12M15 3L3 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          )}
        </svg>
      </button>

      {open && (
        <nav
          aria-label="Mobile"
          className="absolute inset-x-6 top-full z-30 mt-2 rounded-3xl border border-black/10 bg-white p-3 shadow-xl md:inset-x-10 lg:hidden"
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-2xl px-4 py-3 text-[15px] font-medium text-[#0b1533] hover:bg-zinc-100"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="#contact"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-2xl bg-[#0b1533] px-4 py-3 text-center text-[15px] font-semibold text-white"
          >
            Contact Us
          </Link>
        </nav>
      )}
    </header>
  );
}
