import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Logout hanya via POST — GET tidak boleh ada efek samping karena
// Next.js <Link> mem-prefetch URL (pernah menendang session sendiri).
export async function POST(req: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", req.url));
}

export async function GET(req: Request) {
  return NextResponse.redirect(new URL("/", req.url));
}
