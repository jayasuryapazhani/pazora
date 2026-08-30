import { cookies } from "next/headers";

import { sessionCookies } from "@/lib/auth/session";
import { getCurrentSessionUser } from "@/lib/jellyfin/server";

export type ValidatedSession =
  | {
      status: "anonymous";
    }
  | {
      status: "invalid";
    }
  | {
      status: "valid";
      user: {
        id: string;
        name: string;
      };
    };

export async function getValidatedSession(): Promise<ValidatedSession> {
  const cookieStore = await cookies();

  const accessToken =
    cookieStore.get(sessionCookies.accessToken)?.value;

  const deviceId =
    cookieStore.get(sessionCookies.deviceId)?.value;

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