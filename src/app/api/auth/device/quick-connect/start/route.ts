import {
  randomUUID,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  issueQuickConnectPairing,
} from "@/lib/auth/quick-connect";

import {
  getPublicOrigin,
} from "@/lib/http/public-origin";

import {
  initiateJellyfinQuickConnect,
  isJellyfinQuickConnectEnabled,
} from "@/lib/jellyfin/server";

export const dynamic =
  "force-dynamic";

const noStoreHeaders = {
  "Cache-Control":
    "private, no-store",
} as const;

export async function POST(
  request: NextRequest,
) {
  const deviceId =
    randomUUID();

  try {
    const enabled =
      await isJellyfinQuickConnectEnabled(
        deviceId,
      );

    if (!enabled) {
      return NextResponse.json(
        {
          error:
            "Quick Connect is not enabled on the media server.",
        },
        {
          status: 503,
          headers:
            noStoreHeaders,
        },
      );
    }

    const quickConnect =
      await initiateJellyfinQuickConnect(
        deviceId,
      );

    const code =
      quickConnect.Code?.trim();

    const secret =
      quickConnect.Secret?.trim();

    if (
      !code ||
      !secret
    ) {
      throw new Error(
        "Jellyfin returned an incomplete Quick Connect request.",
      );
    }

    const pairing =
      issueQuickConnectPairing({
        secret,
        deviceId,
      });

    const publicOrigin =
      getPublicOrigin(
        request,
      );

    const connectUrl =
      new URL(
        "/tv/connect",
        publicOrigin,
      );

    connectUrl.searchParams.set(
      "code",
      code,
    );

    const qrUrl =
      new URL(
        "/api/auth/device/quick-connect/qr",
        publicOrigin,
      );

    qrUrl.searchParams.set(
      "code",
      code,
    );

    return NextResponse.json(
      {
        code,
        pairingToken:
          pairing.token,
        expiresAt:
          pairing.expiresAt,
        connectUrl:
          connectUrl.toString(),
        qrUrl:
          qrUrl.toString(),
      },
      {
        headers:
          noStoreHeaders,
      },
    );
  } catch {
    console.warn(
      "Unable to initiate Pazora Roku Quick Connect.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to start TV pairing.",
      },
      {
        status: 502,
        headers:
          noStoreHeaders,
      },
    );
  }
}