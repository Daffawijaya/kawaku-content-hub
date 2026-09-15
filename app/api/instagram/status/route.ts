import { NextResponse } from "next/server";
import { IG_USER_ID, isInstagramConfigured } from "@/lib/instagram/config";
import { getPublishingQuota } from "@/lib/instagram/client";

export async function GET() {
  if (!isInstagramConfigured()) {
    return NextResponse.json({ instagram: false });
  }
  try {
    const quota = await getPublishingQuota();
    return NextResponse.json({ instagram: true, userId: IG_USER_ID, quota });
  } catch (e) {
    return NextResponse.json({
      instagram: true,
      userId: IG_USER_ID,
      error: e instanceof Error ? e.message : "Gagal cek kuota IG.",
    });
  }
}
