import {
  cookies,
  headers,
} from "next/headers";

import {
  readDeviceSession,
} from "@/lib/auth/device-session";
import {
  sessionCookies,
} from "@/lib/auth/session";
import {
  getCurrentSessionUser,
} from "@/lib/jellyfin/server";

export type JellyfinContextResult =
  | {
      status: "anonymous";
    }
  | {
      status: "invalid";
    }
  | {
      status: "valid";
      accessToken: string;
      deviceId: string;
      user: {
        id: string;
        name: string;
      };
    };

export type AuthenticatedJellyfinContext =
  Extract<
    JellyfinContextResult,
    {
      status: "valid";
    }
  >;

type SessionCredentialsResult =
  | {
      status: "anonymous";
    }
  | {
      status: "invalid";
    }
  | {
      status: "valid";
      accessToken: string;
      deviceId: string;
    };

async function getSessionCredentials(): Promise<SessionCredentialsResult> {
  const cookieStore =
    await cookies();

  const cookieAccessToken =
    cookieStore.get(
      sessionCookies.accessToken,
    )?.value;

  const cookieDeviceId =
    cookieStore.get(
      sessionCookies.deviceId,
    )?.value;

  if (
    cookieAccessToken &&
    cookieDeviceId
  ) {
    return {
      status: "valid",
      accessToken:
        cookieAccessToken,
      deviceId:
        cookieDeviceId,
    };
  }

  const headerStore =
    await headers();

  const authorization =
    headerStore
      .get("authorization")
      ?.trim();

  if (!authorization) {
    return {
      status: "anonymous",
    };
  }

  const match =
    /^Bearer\s+(.+)$/i.exec(
      authorization,
    );

  if (!match) {
    return {
      status: "anonymous",
    };
  }

  try {
    const claims =
      readDeviceSession(
        match[1].trim(),
      );

    return {
      status: "valid",
      accessToken:
        claims.accessToken,
      deviceId:
        claims.deviceId,
    };
  } catch {
    return {
      status: "invalid",
    };
  }
}

export async function getJellyfinContext(): Promise<JellyfinContextResult> {
  const credentials =
    await getSessionCredentials();

  if (
    credentials.status !==
    "valid"
  ) {
    return {
      status:
        credentials.status,
    };
  }

  try {
    const user =
      await getCurrentSessionUser(
        credentials.accessToken,
        credentials.deviceId,
      );

    if (
      !user.Id ||
      !user.Name
    ) {
      return {
        status: "invalid",
      };
    }

    return {
      status: "valid",
      accessToken:
        credentials.accessToken,
      deviceId:
        credentials.deviceId,
      user: {
        id: user.Id,
        name: user.Name,
      },
    };
  } catch {
    return {
      status: "invalid",
    };
  }
}
