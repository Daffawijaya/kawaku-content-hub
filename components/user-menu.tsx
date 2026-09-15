"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";

export function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("Tim KAWAKU");
  const [initial, setInitial] = useState("DW");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return; // mode mock → avatar statis
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? null);
      const fullName =
        (user.user_metadata?.full_name as string | undefined) ??
        user.email ??
        "U";
      setName(fullName);
      setInitial(
        fullName
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      );
    });
  }, []);

  // Tutup saat Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  const logout = async () => {
    setOpen(false);
    await fetch("/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div ref={boxRef} className="relative ml-1">
      <button
        type="button"
        title={email ?? "Mock user (Supabase belum dikonfigurasi)"}
        aria-label="Menu akun"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 outline-none hover:ring-2 hover:ring-zinc-400/50 dark:bg-zinc-700 dark:text-zinc-100"
      >
        {initial}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Tutup menu akun"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-transparent"
          />
          <div className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-[#212121] dark:ring-white/10">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100">
                {initial}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{name}</span>
                {email && (
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {email}
                  </span>
                )}
              </span>
            </div>
            <div className="border-t border-zinc-200 dark:border-white/10">
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-zinc-900/5 dark:hover:bg-white/10"
              >
                <LogOut className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                Logout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
