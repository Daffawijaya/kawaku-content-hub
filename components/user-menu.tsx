"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [initial, setInitial] = useState("DW");

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return; // mode mock → avatar statis
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? null);
      const name =
        (user.user_metadata?.full_name as string | undefined) ??
        user.email ??
        "U";
      setInitial(
        name
          .split(" ")
          .map((w) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      );
    });
  }, []);

  return (
    <span className="ml-1 flex items-center gap-1">
      <span
        title={email ?? "Mock user (Supabase belum dikonfigurasi)"}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      >
        {initial}
      </span>
      {email && (
        <Link
          href="/auth/signout"
          title={`Logout (${email})`}
          aria-label="Logout"
          className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <LogOut className="h-4 w-4" />
        </Link>
      )}
    </span>
  );
}
