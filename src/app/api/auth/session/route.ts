import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  legacySessionCookies,
  sessionCookies,
} from "@/lib/auth/session";

export const dynamic =
  "force-dynamic";

const privateNoStoreHeaders = {
  "Cache-Control":
    "private, no-store",
} as const;

function clearInvalidAuthentication(
  response: NextResponse,
) {
  const secure =
    process.env.NODE_ENV ===
    "production";

  const expiredCookie = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  response.cookies.set(
    sessionCookies.accessToken,
    "",
    expiredCookie,
  );

  for (
    const cookieName
    of legacySessionCookies
  ) {
    response.cookies.set(
      cookieName,
      "",
      expiredCookie,
    );
  }
}

export async function GET(
  request: NextRequest,
) {
  const context =
    await getJellyfinContext();

  if (context.status === "valid") {
    return NextResponse.json(
      {
        authenticated: true,
        user: context.user,
      },
      {
        headers:
          privateNoStoreHeaders,
      },
    );
  }

  const response =
    NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 401,
        headers:
          privateNoStoreHeaders,
      },
    );

  const hasBrowserAccessToken =
    Boolean(
      request.cookies.get(
        sessionCookies.accessToken,
      )?.value,
    );

  if (
    context.status === "invalid" &&
    hasBrowserAccessToken
  ) {
    clearInvalidAuthentication(
      response,
    );
  }

  return response;
}
