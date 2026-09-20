import { Suspense } from "react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { EmailPasswordSignIn } from "@/components/email-password-signin";
import { GoogleSignInButton } from "@/components/google-signin-button";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSessionProfile } from "@/lib/supabase/server";

export default async function LoginPage() {
  const profile = await getSessionProfile();
  if (profile) redirect("/");

  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <div className="mb-6 text-center">
          <Image src="/kawaky.png" alt="KAWAKU" width={44} height={63} className="mx-auto h-11 w-auto" />
          <h1 className="mt-3 text-lg font-semibold tracking-tight">KAWAKU Content Hub</h1>
          <p className="mt-1 text-sm text-zinc-500">Masuk untuk mengelola konten tim.</p>
        </div>
        {!configured && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Mode mock — Supabase belum dikonfigurasi. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>.env.local</code> (lihat{" "}
            <code>.env.example</code>), lalu mulai ulang dev server.
          </p>
        )}
        <Suspense>
          <GoogleSignInButton />
        </Suspense>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-800" /></div>
          <div className="relative flex justify-center text-[11px] uppercase"><span className="bg-white px-2 text-zinc-400 dark:bg-zinc-950">atau</span></div>
        </div>
        <Suspense>
          <EmailPasswordSignIn />
        </Suspense>
        <p className="mt-4 text-center text-[11px] text-zinc-400">
          Google OAuth via Supabase Auth. Peran diatur admin di tabel profiles.
        </p>
      </Card>
    </div>
  );
}
