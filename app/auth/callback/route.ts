import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/";

  if (!code) return NextResponse.redirect(new URL("/login", url.origin));

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", "oauth");
    return NextResponse.redirect(login);
  }

  // Sync profile (idempotent): buat baris profiles bila belum ada.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email) {
    const name =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email.split("@")[0];
    // ignoreDuplicates: baris existing (termasuk role) tidak pernah ditimpa.
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        name,
        initials: initialsOf(name),
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
