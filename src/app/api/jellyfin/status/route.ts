import { NextResponse } from "next/server";

import { getPublicSystemInfo } from "@/lib/jellyfin/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const info = await getPublicSystemInfo();

    return NextResponse.json({
      online: true,
      serverName: info.ServerName ?? undefined,
      version: info.Version ?? undefined,
      productName: info.ProductName ?? undefined,
    });
  } catch {
    console.warn("Jellyfin status check failed.");

    return NextResponse.json(
      {
        online: false,
        error: "Unable to reach the media server.",
      },
      {
        status: 503,
      },
    );
  }
}
