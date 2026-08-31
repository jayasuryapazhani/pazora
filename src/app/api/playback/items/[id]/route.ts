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
import type {
  PlaybackQualityMode,
} from "@/types/playback";

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

function optionalNonNegativeInteger(
  value: string | null,
): {
  ok: true;
  value: number | null;
} | {
  ok: false;
  error: string;
} {
  if (value === null) {
    return {
      ok: true,
      value: null,
    };
  }

  if (!/^\d+$/.test(value)) {
    return {
      ok: false,
      error:
        "Playback stream index/position must be a non-negative integer.",
    };
  }

  const parsed =
    Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0
  ) {
    return {
      ok: false,
      error:
        "Playback stream index/position is outside the supported range.",
    };
  }

  return {
    ok: true,
    value: parsed,
  };
}

function qualityMode(
  value: string | null,
): {
  ok: true;
  value: PlaybackQualityMode;
} | {
  ok: false;
  error: string;
} {
  if (
    value === null ||
    value === "best"
  ) {
    return {
      ok: true,
      value: "best",
    };
  }

  if (
    value === "1080p" ||
    value === "720p" ||
    value === "480p"
  ) {
    return {
      ok: true,
      value,
    };
  }

  return {
    ok: false,
    error:
      "Unsupported playback quality.",
  };
}

export async function GET(
  request: Request,
  routeContext: RouteContext,
) {
  const requestUrl =
    new URL(
      request.url,
    );

  const requestedAudio =
    optionalNonNegativeInteger(
      requestUrl.searchParams.get(
        "audioStreamIndex",
      ),
    );

  const requestedPosition =
    optionalNonNegativeInteger(
      requestUrl.searchParams.get(
        "positionTicks",
      ),
    );

  const requestedQuality =
    qualityMode(
      requestUrl.searchParams.get(
        "quality",
      ),
    );

  if (
    !requestedAudio.ok ||
    !requestedPosition.ok ||
    !requestedQuality.ok
  ) {
    const error =
      !requestedAudio.ok
        ? requestedAudio.error
        : !requestedPosition.ok
          ? requestedPosition.error
          : !requestedQuality.ok
            ? requestedQuality.error
            : "Invalid playback preference.";

    return NextResponse.json(
      {
        error,
      },
      {
        status: 400,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

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
        {
          audioStreamIndex:
            requestedAudio.value,
          qualityMode:
            requestedQuality.value,
          positionTicks:
            requestedPosition.value,
        },
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