import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { EmailPasswordSignIn } from "@/components/email-password-signin";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionProfile } from "@/lib/supabase/server";

export default async function LoginPage() {
  const profile = await getSessionProfile();
  if (profile) redirect("/dashboard");

  const configured = isSupabaseConfigured();

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 bg-[#14101f]">
      {/* Background container dengan blur pada gambar */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src="/ChatGPT%20Image%20Sep%2020,%202026,%2004_42_08%20PM.png"
          alt=""
          aria-hidden
          className="h-full w-full object-cover opacity-60 blur-xl scale-105"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/70" />
      </div>

      {/* Card tanpa backdrop blur, warna solid #0f0f0f */}
      <div className="relative w-full max-w-sm p-6 sm:p-8 rounded-2xl bg-[#0f0f0f] border border-white/10">
        <div className="mb-6 text-center">
          <Image src="/kawaky.png" alt="KAWAKU" width={44} height={63} className="mx-auto h-11 w-auto" />
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-white">KAWAKU Content Hub</h1>
          <p className="mt-1 text-sm text-zinc-300">Masuk untuk mengelola konten tim.</p>
        </div>
        {!configured && (
          <p className="mb-4 rounded-lg border border-amber-500/30 bg-amber-950/50 px-3 py-2.5 text-xs text-amber-200">
            Mode mock — Supabase belum dikonfigurasi. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>.env.local</code> (lihat{" "}
            <code>.env.example</code>), lalu mulai ulang dev server.
          </p>
        )}
        <Suspense>
          <GoogleSignInButton />
        </Suspense>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-[#0f0f0f] px-2 text-zinc-400">atau</span>
          </div>
        </div>
        <Suspense>
          <EmailPasswordSignIn />
        </Suspense>
      </div>
    </div>
  );
}
