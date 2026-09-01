import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  issueDeviceSession,
} from "@/lib/auth/device-session";

import {
  readQuickConnectPairing,
  type QuickConnectPairingClaims,
} from "@/lib/auth/quick-connect";

import {
  authenticateJellyfinQuickConnect,
  getJellyfinQuickConnectState,
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
  let body: {
    pairingToken?: unknown;
  };

  try {
    body =
      (await request.json()) as {
        pairingToken?: unknown;
      };
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid pairing request.",
      },
      {
        status: 400,
        headers:
          noStoreHeaders,
      },
    );
  }

  if (
    typeof body.pairingToken !==
      "string" ||
    body.pairingToken.trim()
      .length === 0
  ) {
    return NextResponse.json(
      {
        error:
          "Pairing token is required.",
      },
      {
        status: 400,
        headers:
          noStoreHeaders,
      },
    );
  }

  let pairing:
    QuickConnectPairingClaims;

  try {
    pairing =
      readQuickConnectPairing(
        body.pairingToken.trim(),
      );
  } catch {
    return NextResponse.json(
      {
        status:
          "expired",
      },
      {
        status: 401,
        headers:
          noStoreHeaders,
      },
    );
  }

  try {
    const state =
      await getJellyfinQuickConnectState(
        pairing.secret,
        pairing.deviceId,
      );

    if (
      state.Authenticated !==
      true
    ) {
      return NextResponse.json(
        {
          status:
            "pending",
        },
        {
          headers:
            noStoreHeaders,
        },
      );
    }

    const authentication =
      await authenticateJellyfinQuickConnect(
        pairing.secret,
        pairing.deviceId,
      );

    const accessToken =
      authentication.AccessToken;

    const userId =
      authentication.User?.Id;

    const userName =
      authentication.User?.Name;

    if (
      !accessToken ||
      !userId ||
      !userName
    ) {
      throw new Error(
        "Jellyfin returned an incomplete Quick Connect authentication.",
      );
    }

    const session =
      issueDeviceSession({
        accessToken,
        deviceId:
          pairing.deviceId,
      });

    return NextResponse.json(
      {
        status:
          "authenticated",
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
      },
      {
        headers:
          noStoreHeaders,
      },
    );
  } catch {
    console.warn(
      "Unable to complete Pazora Roku Quick Connect.",
    );

    return NextResponse.json(
      {
        error:
          "Unable to complete TV pairing.",
      },
      {
        status: 502,
        headers:
          noStoreHeaders,
      },
    );
  }
}