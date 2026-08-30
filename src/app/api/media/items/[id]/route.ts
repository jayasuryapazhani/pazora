import { NextResponse } from "next/server";

import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaDetailsData,
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
  void request;

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

  const itemId =
    parseMediaItemId(
      routeParams.id,
      "id",
    );

  if (!itemId.ok) {
    return NextResponse.json(
      {
        error: itemId.error,
      },
      {
        status: 400,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  try {
    const details =
      await getMediaDetailsData(
        context,
        itemId.value,
      );

    return NextResponse.json(
      {
        authenticated: true,
        details,
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
            "Media item not found.",
        },
        {
          status: 404,
          headers:
            privateNoStoreHeaders,
        },
      );
    }

    console.warn(
      "Jellyfin media details query failed.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to load media details.",
      },
      {
        status: 502,
        headers:
          privateNoStoreHeaders,
      },
    );
  }
}