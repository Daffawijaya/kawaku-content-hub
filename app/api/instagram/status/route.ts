import { NextResponse } from "next/server";
import { IG_USER_ID, isInstagramConfigured } from "@/lib/instagram/config";
import { getPublishingQuota } from "@/lib/instagram/client";
import { tokenStatus } from "@/lib/instagram/token";

export async function GET() {
  if (!isInstagramConfigured()) {
    return NextResponse.json({ instagram: false });
  }
  const token = await tokenStatus();
  try {
    const quota = await getPublishingQuota();
    return NextResponse.json({ instagram: true, userId: IG_USER_ID, quota, token });
  } catch (e) {
    return NextResponse.json({
      instagram: true,
      userId: IG_USER_ID,
      token,
      error: e instanceof Error ? e.message : "Gagal cek kuota IG.",
    });
  }
}
