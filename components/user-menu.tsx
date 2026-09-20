"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { AvatarPhoto } from "@/components/ui/avatar";
import { AVATAR_EVENT } from "@/lib/profile-avatar";
import { getBrowserClient } from "@/lib/supabase/client";

export function UserMenu() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState("Tim KAWAKU");
  const [initial, setInitial] = useState("DW");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserClient();
    if (!supabase) return; // mode mock → avatar statis
    let live = true;
    async function loadAvatar() {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !live) return;
      // Foto profil sendiri (abaikan bila kolom belum migrasi).
      const { data: row } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      const url = (row as { avatar_url?: string | null } | null)?.avatar_url;
      if (live) setAvatarUrl(url ?? null);
    }
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user || !live) return;
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
    void loadAvatar();
    // Refresh tiap ganti foto di settings + tiap pindah halaman
    // (layout tak remount saat navigasi client-side).
    window.addEventListener(AVATAR_EVENT, loadAvatar);
    return () => {
      live = false;
      window.removeEventListener(AVATAR_EVENT, loadAvatar);
    };
  }, [pathname]);

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
            className="rounded-full outline-none hover:ring-2 hover:ring-zinc-400/50"
          >
            <AvatarPhoto
              name={name}
              fallback={initial}
              url={avatarUrl}
              className="h-8 w-8 bg-zinc-200 text-xs font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
            />
          </button>
        )}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <AvatarPhoto
            name={name}
            fallback={initial}
            url={avatarUrl}
            className="h-10 w-10 bg-zinc-200 text-sm font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
          />
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
          <DropdownItem icon={<Settings className="h-4 w-4" />} href="/settings">
            Pengaturan
          </DropdownItem>
          <DropdownItem icon={<LogOut className="h-4 w-4" />} onClick={logout}>
            Keluar
          </DropdownItem>
        </div>
      </Dropdown>
    </div>
  );
}
