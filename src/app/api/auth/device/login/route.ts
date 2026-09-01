import {
  randomUUID,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  issueDeviceSession,
} from "@/lib/auth/device-session";
import {
  appConfig,
} from "@/lib/config";
import {
  authenticateUser,
} from "@/lib/jellyfin/server";
import type {
  DeviceLoginResponse,
  LoginRequest,
} from "@/types/auth";

export const dynamic =
  "force-dynamic";

const privateNoStoreHeaders = {
  "Cache-Control":
    "private, no-store",
} as const;

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as
        Partial<LoginRequest>;

    const username =
      body.username?.trim();

    const password =
      body.password ?? "";

    if (!username) {
      return NextResponse.json(
        {
          error:
            "Username is required.",
        },
        {
          status: 400,
          headers:
            privateNoStoreHeaders,
        },
      );
    }

    const deviceId =
      randomUUID();

    const auth =
      await authenticateUser(
        username,
        password,
        deviceId,
        `${appConfig.name} Roku`,
      );

    const accessToken =
      auth.AccessToken;

    const userId =
      auth.User?.Id;

    const userName =
      auth.User?.Name;

    if (
      !accessToken ||
      !userId ||
      !userName
    ) {
      return NextResponse.json(
        {
          error:
            "Jellyfin did not return a valid user session.",
        },
        {
          status: 401,
          headers:
            privateNoStoreHeaders,
        },
      );
    }

    const session =
      issueDeviceSession({
        accessToken,
        deviceId,
      });

    const payload:
      DeviceLoginResponse = {
        user: {
          id:
            userId,
          name:
            userName,
        },
        session: {
          token:
            session.token,
          expiresAt:
            session.expiresAt,
        },
      };

    return NextResponse.json(
      payload,
      {
        headers:
          privateNoStoreHeaders,
      },
    );
  } catch {
    // Do not log authentication error objects.
    // They may contain request payload information.
    console.warn(
      "Pazora Roku login attempt failed.",
    );

    return NextResponse.json(
      {
        error:
          "Incorrect username or password.",
      },
      {
        status: 401,
        headers:
          privateNoStoreHeaders,
      },
    );
  }
}
