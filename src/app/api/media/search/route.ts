import { NextResponse } from "next/server";

import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaSearchData,
} from "@/lib/jellyfin/media";
import {
  parseMediaPagination,
  parseMediaSearchTerm,
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

  const query =
    parseMediaSearchTerm(
      searchParams.get("q"),
    );

  if (!query.ok) {
    return NextResponse.json(
      {
        error: query.error,
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
    const search =
      await getMediaSearchData(
        context,
        query.value,
        pagination.value.startIndex,
        pagination.value.limit,
      );

    return NextResponse.json(
      {
        authenticated: true,
        search,
      },
      {
        headers:
          privateNoStoreHeaders,
      },
    );
  } catch {
    console.warn(
      "Jellyfin media search query failed.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to search the media library.",
      },
      {
        status: 502,
        headers:
          privateNoStoreHeaders,
      },
    );
  }
}