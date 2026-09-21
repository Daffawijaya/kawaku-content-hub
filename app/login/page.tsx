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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#eef0f4] px-4">
      {/* BG sama seperti landing, dibuat blur ala liquid glass.
          Overlay penyeimbang: putih di light mode, hitam di dark mode. */}
      <div aria-hidden className="absolute inset-0">
        <Image
          src="/kawaku-bg.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="scale-110 object-cover object-center blur-2xl"
        />
        <div aria-hidden className="absolute inset-0 bg-white/40 dark:bg-black/50" />
      </div>

      {/* Card modal disamakan ModalShell size sm: rounded-2xl bg-white,
          tanpa border/shadow/blur di panel (blur sudah di BG). */}
      <div className="relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white p-6 sm:p-8 dark:bg-[#212121]">
        <div className="mb-6 text-center">
          <Image src="/kawaky.png" alt="KAWAKU" width={44} height={63} className="mx-auto h-11 w-auto" />
          <h1 className="mt-3 text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">KAWAKU Content Hub</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Masuk untuk mengelola konten tim.</p>
        </div>
        {!configured && (
          <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-100/80 px-3 py-2.5 text-xs text-amber-900">
            Mode mock — Supabase belum dikonfigurasi. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>.env.local</code> (lihat{" "}
            <code>.env.example</code>), lalu mulai ulang dev server.
          </p>
        )}
        <Suspense>
          <EmailPasswordSignIn />
        </Suspense>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-200 dark:border-[#4c4c4c]" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-white px-2 text-zinc-500 dark:bg-[#212121] dark:text-zinc-400">atau</span>
          </div>
        </div>
        <Suspense>
          <GoogleSignInButton />
        </Suspense>
      </div>
    </div>
  );
}
