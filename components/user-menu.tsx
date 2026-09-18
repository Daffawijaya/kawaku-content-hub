"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { getBrowserClient } from "@/lib/supabase/client";

export function UserMenu() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("Tim KAWAKU");
  const [initial, setInitial] = useState("DW");

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

  const logout = async () => {
    await fetch("/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="ml-1">
      <Dropdown
        width="w-72"
        menuClassName="rounded-xl py-0"
        trigger={(open) => (
          <button
            type="button"
            title={email ?? "Pengguna mock (Supabase belum dikonfigurasi)"}
            aria-label="Menu akun"
            aria-expanded={open}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700 outline-none hover:ring-2 hover:ring-zinc-400/50 dark:bg-zinc-700 dark:text-zinc-100"
          >
            {initial}
          </button>
        )}
      >
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
        <div className="border-t border-zinc-200 py-1 dark:border-zinc-700">
          <DropdownItem icon={<LogOut className="h-4 w-4" />} onClick={logout}>
            Keluar
          </DropdownItem>
        </div>
      </Dropdown>
    </div>
  );
}
