import { randomUUID } from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  deviceMaxAgeSeconds,
  sessionCookies,
  sessionMaxAgeSeconds,
} from "@/lib/auth/session";
import { authenticateUser } from "@/lib/jellyfin/server";
import type {
  LoginRequest,
  LoginResponse,
} from "@/types/auth";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as Partial<LoginRequest>;

    const username =
      body.username?.trim();

    const password =
      body.password ?? "";

    if (!username) {
      return NextResponse.json(
        {
          error: "Username is required.",
        },
        {
          status: 400,
        },
      );
    }

    const existingDeviceId =
      request.cookies.get(
        sessionCookies.deviceId,
      )?.value;

    const deviceId =
      existingDeviceId || randomUUID();

    const auth =
      await authenticateUser(
        username,
        password,
        deviceId,
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
        },
      );
    }

    const payload: LoginResponse = {
      user: {
        id: userId,
        name: userName,
      },
    };

    const response =
      NextResponse.json(payload);

    const secure =
      process.env.NODE_ENV === "production";

    response.cookies.set(
      sessionCookies.accessToken,
      accessToken,
      {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAgeSeconds,
      },
    );

    response.cookies.set(
      sessionCookies.deviceId,
      deviceId,
      {
        httpOnly: true,
        secure,
        sameSite: "lax",
        path: "/",
        maxAge: deviceMaxAgeSeconds,
      },
    );

    return response;
  } catch (error) {
    console.error(
      "Jellyfin login failed:",
      error,
    );

    return NextResponse.json(
      {
        error: "Incorrect username or password.",
      },
      {
        status: 401,
      },
    );
  }
}