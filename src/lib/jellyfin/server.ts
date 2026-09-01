import { Jellyfin } from "@jellyfin/sdk";
import {
  getSessionApi,
  getSystemApi,
  getUserApi,
} from "@jellyfin/sdk/lib/utils/api/index.js";

import {
  appConfig,
} from "@/lib/config";

function getServerUrl(): string {
  const value =
    process.env
      .JELLYFIN_SERVER_URL
      ?.replace(/\/$/, "");

  if (!value) {
    throw new Error(
      "JELLYFIN_SERVER_URL is not configured.",
    );
  }

  return value;
}

export function createJellyfinApi(
  deviceId: string,
  deviceName = "Web Browser",
) {
  const jellyfin =
    new Jellyfin({
      clientInfo: {
        name:
          appConfig.name,
        version:
          appConfig.version,
      },
      deviceInfo: {
        name:
          deviceName,
        id:
          deviceId,
      },
    });

  return jellyfin.createApi(
    getServerUrl(),
  );
}

export function createAuthenticatedJellyfinApi(
  accessToken: string,
  deviceId: string,
) {
  const api =
    createJellyfinApi(
      deviceId,
      `${appConfig.name} Web`,
    );

  api.accessToken =
    accessToken;

  return api;
}

export async function getPublicSystemInfo() {
  const api =
    createJellyfinApi(
      "lifeofpriya-media-server",
      appConfig.name,
    );

  const response =
    await getSystemApi(
      api,
    ).getPublicSystemInfo();

  return response.data;
}

export async function authenticateUser(
  username: string,
  password: string,
  deviceId: string,
  deviceName =
    `${appConfig.name} Web`,
) {
  const api =
    createJellyfinApi(
      deviceId,
      deviceName,
    );

  const response =
    await getUserApi(
      api,
    ).authenticateUserByName({
      authenticateUserByName: {
        Username:
          username,
        Pw:
          password,
      },
    });

  return response.data;
}

export async function getCurrentSessionUser(
  accessToken: string,
  deviceId: string,
) {
  const api =
    createAuthenticatedJellyfinApi(
      accessToken,
      deviceId,
    );

  const response =
    await getUserApi(
      api,
    ).getCurrentUser();

  return response.data;
}

export async function endJellyfinSession(
  accessToken: string,
  deviceId: string,
) {
  const api =
    createAuthenticatedJellyfinApi(
      accessToken,
      deviceId,
    );

  await getSessionApi(
    api,
  ).reportSessionEnded();
}
