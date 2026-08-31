import {
  getUserLibraryApi,
} from "@jellyfin/sdk/lib/utils/api/index.js";
import {
  NextResponse,
} from "next/server";

import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  createAuthenticatedJellyfinApi,
} from "@/lib/jellyfin/server";
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

function parseFavoriteState(
  value: unknown,
): boolean | null {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return null;
  }

  const favorite =
    Reflect.get(
      value,
      "favorite",
    );

  return typeof favorite === "boolean"
    ? favorite
    : null;
}

export async function POST(
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

  let body: unknown;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Favorite request body must be valid JSON.",
      },
      {
        status: 400,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  const favorite =
    parseFavoriteState(body);

  if (favorite === null) {
    return NextResponse.json(
      {
        error:
          "Favorite state must be a boolean.",
      },
      {
        status: 400,
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  const api =
    createAuthenticatedJellyfinApi(
      context.accessToken,
      context.deviceId,
    );

  const userLibraryApi =
    getUserLibraryApi(api);

  try {
    if (favorite) {
      await userLibraryApi.markFavoriteItem({
        itemId: itemId.value,
        userId: context.user.id,
      });
    } else {
      await userLibraryApi.unmarkFavoriteItem({
        itemId: itemId.value,
        userId: context.user.id,
      });
    }

    return NextResponse.json(
      {
        authenticated: true,
        itemId:
          itemId.value,
        favorite,
      },
      {
        headers:
          privateNoStoreHeaders,
      },
    );
  } catch {
    console.warn(
      "Jellyfin favorite update failed.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to update favorite state.",
      },
      {
        status: 502,
        headers:
          privateNoStoreHeaders,
      },
    );
  }
}