import { NextResponse } from "next/server";

import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaBrowseData,
} from "@/lib/jellyfin/media";
import {
  parseMediaBrowseKind,
  parseMediaPagination,
} from "@/lib/utils/media-query";

export const dynamic = "force-dynamic";

const privateNoStoreHeaders = {
  "Cache-Control":
    "private, no-store",
} as const;

export async function GET(
  request: Request,
) {
  const context =
    await getJellyfinContext();

  if (context.status !== "valid") {
    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 401,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  const searchParams =
    new URL(request.url).searchParams;

  const kind =
    parseMediaBrowseKind(
      searchParams.get("kind"),
    );

  if (!kind.ok) {
    return NextResponse.json(
      {
        error: kind.error,
      },
      {
        status: 400,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  const pagination =
    parseMediaPagination(
      searchParams,
    );

  if (!pagination.ok) {
    return NextResponse.json(
      {
        error: pagination.error,
      },
      {
        status: 400,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  try {
    const media =
      await getMediaBrowseData(
        context,
        kind.value,
        pagination.value.startIndex,
        pagination.value.limit,
      );

    return NextResponse.json(
      {
        authenticated: true,
        media,
      },
      {
        headers:
          privateNoStoreHeaders,
      },
    );
  } catch {
    console.warn(
      "Jellyfin media browse query failed.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to load the requested media page.",
      },
      {
        status: 502,
        headers:
          privateNoStoreHeaders,
      },
    );
  }
}