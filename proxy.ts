import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/", "/login", "/auth/callback", "/auth/signout", "/auth/error", "/privacy", "/api/instagram/status"];

// Cron Vercel (tanpa sesi user) lolos bila bawa secret yg cocok.
function isCronRequest(req: NextRequest) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const cronPaths = ["/api/instagram/autopublish", "/api/instagram/sync"];
  const path = req.nextUrl.pathname;
  return (
    cronPaths.includes(path) && req.headers.get("authorization") === `Bearer ${secret}`
  );
}

export default async function proxy(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // Mode mock: Supabase belum dikonfigurasi → lewati proteksi,
  // semua halaman tetap bisa dibuka untuk development.
  if (!url || !key) return NextResponse.next();

  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (toSet) => {
        toSet.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

  if (!user && !isPublic && !isCronRequest(req)) {
    const login = req.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }
  if (user && path === "/login") {
    const home = req.nextUrl.clone();
    home.pathname = "/dashboard";
    home.search = "";
    return NextResponse.redirect(home);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
