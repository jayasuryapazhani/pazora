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
import {
  endJellyfinSession,
} from "@/lib/jellyfin/server";

export const dynamic =
  "force-dynamic";

function clearAuthenticationCookies(
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

  // Preserve the browser device ID so later browser logins
  // continue representing the same Jellyfin device.
}

async function revokeSession() {
  const context =
    await getJellyfinContext();

  if (context.status !== "valid") {
    return;
  }

  try {
    await endJellyfinSession(
      context.accessToken,
      context.deviceId,
    );
  } catch {
    // Local authentication is still discarded even when
    // Jellyfin already considers the session invalid.
    //
    // Never log HTTP error objects here because they can
    // contain authentication headers.
    console.warn(
      "Unable to revoke Jellyfin session.",
    );
  }
}

export async function POST() {
  await revokeSession();

  const response =
    NextResponse.json({
      success: true,
    });

  clearAuthenticationCookies(
    response,
  );

  return response;
}

export async function GET(
  request: NextRequest,
) {
  await revokeSession();

  const loginUrl =
    new URL(
      "/login",
      request.url,
    );

  if (
    request.nextUrl.searchParams.get(
      "reason",
    ) === "expired"
  ) {
    loginUrl.searchParams.set(
      "session",
      "expired",
    );
  }

  const response =
    NextResponse.redirect(
      loginUrl,
    );

  clearAuthenticationCookies(
    response,
  );

  return response;
}
