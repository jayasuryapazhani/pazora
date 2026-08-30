import { NextResponse } from "next/server";

import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaEpisodesData,
} from "@/lib/jellyfin/media";
import {
  parseMediaItemId,
} from "@/lib/utils/media-query";

export const dynamic = "force-dynamic";

const privateNoStoreHeaders = {
  "Cache-Control":
    "private, no-store",
} as const;

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function getUpstreamStatus(
  error: unknown,
): number | null {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return null;
  }

  const response =
    Reflect.get(
      error,
      "response",
    );

  if (
    typeof response !== "object" ||
    response === null
  ) {
    return null;
  }

  const status =
    Reflect.get(
      response,
      "status",
    );

  return typeof status === "number"
    ? status
    : null;
}

export async function GET(
  request: Request,
  routeContext: RouteContext,
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

  const routeParams =
    await routeContext.params;

  const seriesId =
    parseMediaItemId(
      routeParams.id,
      "id",
    );

  if (!seriesId.ok) {
    return NextResponse.json(
      {
        error: seriesId.error,
      },
      {
        status: 400,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  const searchParams =
    new URL(request.url).searchParams;

  const seasonId =
    parseMediaItemId(
      searchParams.get("seasonId"),
      "seasonId",
    );

  if (!seasonId.ok) {
    return NextResponse.json(
      {
        error: seasonId.error,
      },
      {
        status: 400,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  try {
    const episodes =
      await getMediaEpisodesData(
        context,
        seriesId.value,
        seasonId.value,
      );

    return NextResponse.json(
      {
        authenticated: true,
        episodes,
      },
      {
        headers:
          privateNoStoreHeaders,
      },
    );
  } catch (error) {
    if (
      getUpstreamStatus(error) === 404
    ) {
      return NextResponse.json(
        {
          error:
            "Series or season not found.",
        },
        {
          status: 404,
          headers:
            privateNoStoreHeaders,
        },
      );
    }

    console.warn(
      "Jellyfin season episodes query failed.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to load season episodes.",
      },
      {
        status: 502,
        headers:
          privateNoStoreHeaders,
      },
    );
  }
}