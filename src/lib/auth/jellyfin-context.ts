import { cookies } from "next/headers";

import { sessionCookies } from "@/lib/auth/session";
import { getCurrentSessionUser } from "@/lib/jellyfin/server";

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
  Extract<JellyfinContextResult, { status: "valid" }>;

export async function getJellyfinContext(): Promise<JellyfinContextResult> {
  const cookieStore = await cookies();

  const accessToken =
    cookieStore.get(
      sessionCookies.accessToken,
    )?.value;

  const deviceId =
    cookieStore.get(
      sessionCookies.deviceId,
    )?.value;

  if (!accessToken || !deviceId) {
    return {
      status: "anonymous",
    };
  }

  try {
    const user =
      await getCurrentSessionUser(
        accessToken,
        deviceId,
      );

    if (!user.Id || !user.Name) {
      return {
        status: "invalid",
      };
    }

    return {
      status: "valid",
      accessToken,
      deviceId,
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