import { NextResponse } from "next/server";
import { isDriveConfigured } from "@/lib/drive/config";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export async function GET() {
  return NextResponse.json({
    drive: isDriveConfigured(),
    database: isSupabaseConfigured(),
  });
}
