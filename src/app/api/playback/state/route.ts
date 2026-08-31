import {
  NextResponse,
} from "next/server";

import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  reportPlaybackState,
} from "@/lib/jellyfin/playback";
import {
  parsePlaybackStateUpdate,
} from "@/lib/utils/playback-state";

export const dynamic =
  "force-dynamic";

const privateNoStoreHeaders = {
  "Cache-Control":
    "private, no-store",
} as const;

export async function POST(
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

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Playback state body must be valid JSON.",
      },
      {
        status: 400,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  const parsed =
    parsePlaybackStateUpdate(
      body,
    );

  if (!parsed.ok) {
    return NextResponse.json(
      {
        error: parsed.error,
      },
      {
        status: 400,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  try {
    await reportPlaybackState(
      context,
      parsed.value,
    );

    return NextResponse.json(
      {
        authenticated: true,
        accepted: true,
      },
      {
        headers:
          privateNoStoreHeaders,
      },
    );
  } catch {
    console.warn(
      "Jellyfin playback-state reporting failed.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to update playback state.",
      },
      {
        status: 502,
        headers:
          privateNoStoreHeaders,
      },
    );
  }
}