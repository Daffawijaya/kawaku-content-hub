"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { pillGlass } from "@/components/ui/button";

export function EmailPasswordSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = getBrowserClient();
    if (!supabase) {
      setError("Supabase belum dikonfigurasi.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      window.location.href = next;
    }
  }

  return (
    <form onSubmit={signIn} className="space-y-3">
      <input
        type="email"
        placeholder="Email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm text-zinc-900 shadow-sm transition-colors outline-none placeholder:text-zinc-400 focus:border-brand-500 dark:border-zinc-600 dark:text-zinc-100 dark:focus:border-brand-500"
      />
      <input
        type="password"
        placeholder="Password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm text-zinc-900 shadow-sm transition-colors outline-none placeholder:text-zinc-400 focus:border-brand-500 dark:border-zinc-600 dark:text-zinc-100 dark:focus:border-brand-500"
      />
      {/* Abu liquid glass persis tombol sekunder modal create (pillGlass).
          Gabung string biasa: cn()/twMerge membuang bg-gradient-to-b. */}
      <button type="submit" disabled={loading} className={`${pillGlass} w-full`}>
        {loading ? "Masuk…" : "Masuk dengan Email"}
      </button>
      {error && <p className="text-center text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </form>
  );
}
