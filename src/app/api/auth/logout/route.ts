import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  legacySessionCookies,
  sessionCookies,
} from "@/lib/auth/session";
import { endJellyfinSession } from "@/lib/jellyfin/server";

export const dynamic = "force-dynamic";

function clearAuthenticationCookies(
  response: NextResponse,
) {
  const secure =
    process.env.NODE_ENV === "production";

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

  // Keep the device ID so repeated logins from the same
  // browser remain one Jellyfin device instead of creating
  // a new device entry every time.
}

async function revokeSession(
  request: NextRequest,
) {
  const accessToken =
    request.cookies.get(
      sessionCookies.accessToken,
    )?.value;

  const deviceId =
    request.cookies.get(
      sessionCookies.deviceId,
    )?.value;

  if (!accessToken || !deviceId) {
    return;
  }

  try {
    await endJellyfinSession(
      accessToken,
      deviceId,
    );
  } catch (error) {
    // We still clear the local session even if Jellyfin
    // already considers the token invalid.
    console.warn(
      "Unable to revoke Jellyfin session:",
      error,
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  await revokeSession(request);

  const response =
    NextResponse.json({
      success: true,
    });

  clearAuthenticationCookies(response);

  return response;
}

export async function GET(
  request: NextRequest,
) {
  await revokeSession(request);

  const loginUrl =
    new URL("/login", request.url);

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
    NextResponse.redirect(loginUrl);

  clearAuthenticationCookies(response);

  return response;
}