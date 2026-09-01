import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";

import {
  authorizeJellyfinQuickConnect,
} from "@/lib/jellyfin/server";

export const dynamic =
  "force-dynamic";

const noStoreHeaders = {
  "Cache-Control":
    "private, no-store",
} as const;

export async function POST(
  request: NextRequest,
) {
  const context =
    await getJellyfinContext();

  if (
    context.status !==
    "valid"
  ) {
    return NextResponse.json(
      {
        error:
          "Sign in before connecting a TV.",
      },
      {
        status: 401,
        headers:
          noStoreHeaders,
      },
    );
  }

  let body: {
    code?: unknown;
  };

  try {
    body =
      (await request.json()) as {
        code?: unknown;
      };
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid TV connection request.",
      },
      {
        status: 400,
        headers:
          noStoreHeaders,
      },
    );
  }

  if (
    typeof body.code !==
      "string" ||
    body.code.trim()
      .length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "TV connection code is required.",
      },
      {
        status: 400,
        headers:
          noStoreHeaders,
      },
    );
  }

  try {
    const authorized =
      await authorizeJellyfinQuickConnect(
        context.accessToken,
        context.deviceId,
        body.code.trim(),
        context.user.id,
      );

    if (!authorized) {
      return NextResponse.json(
        {
          error:
            "The TV connection code is invalid or expired.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
      },
      {
        headers:
          noStoreHeaders,
      },
    );
  } catch {
    console.warn(
      "Unable to authorize Pazora Roku Quick Connect.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to authorize this TV.",
      },
      {
        status: 502,
        headers:
          noStoreHeaders,
      },
    );
  }
}