"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

export function LoginTransition({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-[#14101f]">
      {/* Background container dengan animasi fade-in */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <img
          src="/ChatGPT%20Image%20Sep%2020,%202026,%2004_42_08%20PM.png"
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-60 blur-xl scale-105"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
      </motion.div>

      {/* Card dengan animasi modal-like (scale + fade) */}
      <motion.div
        className="relative w-full max-w-sm p-6 sm:p-8 rounded-2xl bg-[#0f0f0f] border border-white/10"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
