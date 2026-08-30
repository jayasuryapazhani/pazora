import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  legacySessionCookies,
  sessionCookies,
} from "@/lib/auth/session";
import { getCurrentSessionUser } from "@/lib/jellyfin/server";

export const dynamic = "force-dynamic";

function clearInvalidAuthentication(
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
}

export async function GET(
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
    return NextResponse.json(
      {
        authenticated: false,
      },
      {
        status: 401,
      },
    );
  }

  try {
    const user =
      await getCurrentSessionUser(
        accessToken,
        deviceId,
      );

    if (!user.Id || !user.Name) {
      throw new Error(
        "Jellyfin returned an invalid user.",
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.Id,
        name: user.Name,
      },
    });
  } catch {
    const response =
      NextResponse.json(
        {
          authenticated: false,
        },
        {
          status: 401,
        },
      );

    clearInvalidAuthentication(
      response,
    );

    return response;
  }
}