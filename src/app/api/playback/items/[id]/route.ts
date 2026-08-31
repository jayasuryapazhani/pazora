import {
  NextResponse,
} from "next/server";

import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaDetailsData,
} from "@/lib/jellyfin/media";
import {
  getPlaybackPlan,
} from "@/lib/jellyfin/playback";
import {
  attachPlaybackTransport,
} from "@/lib/jellyfin/playback-transport";
import {
  parseMediaItemId,
} from "@/lib/utils/media-query";

export const dynamic =
  "force-dynamic";

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

    if (
      details.item.type !==
        "Movie" &&
      details.item.type !==
        "Episode"
    ) {
      return NextResponse.json(
        {
          error:
            "This media item is not directly playable.",
        },
        {
          status: 409,
          headers:
            privateNoStoreHeaders,
        },
      );
    }

    const basePlayback =
      await getPlaybackPlan(
        context,
        itemId.value,
        details.item.user
          .playbackPositionTicks,
      );

    const playback =
      attachPlaybackTransport(
        context,
        basePlayback,
      );

    return NextResponse.json(
      {
        authenticated: true,
        playback,
      },
      {
        headers:
          privateNoStoreHeaders,
      },
    );
  } catch (error) {
    if (
      getUpstreamStatus(error) ===
      404
    ) {
      return NextResponse.json(
        {
          error:
            "Playable media item not found.",
        },
        {
          status: 404,
          headers:
            privateNoStoreHeaders,
        },
      );
    }

    console.warn(
      "Jellyfin playback-info query failed.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to prepare playback.",
      },
      {
        status: 502,
        headers:
          privateNoStoreHeaders,
      },
    );
  }
}