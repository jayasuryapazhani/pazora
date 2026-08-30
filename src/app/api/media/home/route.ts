import { NextResponse } from "next/server";

import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaHomeData,
} from "@/lib/jellyfin/media";

export const dynamic = "force-dynamic";

export async function GET() {
  const context =
    await getJellyfinContext();

  if (context.status !== "valid") {
    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 401,
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  }

  try {
    const media =
      await getMediaHomeData(context);

    return NextResponse.json(
      {
        authenticated: true,
        user: context.user,
        media,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  } catch {
    console.warn(
      "Jellyfin media query failed.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to load the media library.",
      },
      {
        status: 502,
        headers: {
          "Cache-Control":
            "private, no-store",
        },
      },
    );
  }
}