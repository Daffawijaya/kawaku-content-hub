import { Suspense } from "react";
import { redirect } from "next/navigation";
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
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">
            K
          </span>
          <h1 className="mt-3 text-lg font-semibold tracking-tight">KAWAKU Content Hub</h1>
          <p className="mt-1 text-sm text-zinc-500">Masuk untuk mengelola konten tim.</p>
        </div>
        {!configured && (
          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            Mode mock — Supabase belum dikonfigurasi. Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> di <code>.env.local</code> (lihat{" "}
            <code>.env.example</code>), lalu restart dev server.
          </p>
        )}
        <Suspense>
          <GoogleSignInButton />
        </Suspense>
        <p className="mt-4 text-center text-[11px] text-zinc-400">
          Google OAuth via Supabase Auth. Role diatur admin di tabel profiles.
        </p>
      </Card>
    </div>
  );
}
