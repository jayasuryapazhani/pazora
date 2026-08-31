import {
  NextResponse,
} from "next/server";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const noStoreHeaders = {
  "Cache-Control":
    "no-store, max-age=0",
} as const;

function configured(
  value:
    string | undefined,
): boolean {
  return Boolean(
    value?.trim(),
  );
}

function validHttpUrl(
  value:
    string | undefined,
): boolean {
  const candidate =
    value?.trim();

  if (!candidate) {
    return false;
  }

  try {
    const url =
      new URL(candidate);

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
}

function validPlaybackGrantSecret(
  value:
    string | undefined,
): boolean {
  const candidate =
    value?.trim();

  if (!candidate) {
    return false;
  }

  try {
    return (
      Buffer.from(
        candidate,
        "base64url",
      ).length === 32
    );
  } catch {
    return false;
  }
}

export async function GET() {
  const checks = {
    jellyfinServerUrl:
      validHttpUrl(
        process.env
          .JELLYFIN_SERVER_URL,
      ),

    jellyfinPublicUrl:
      validHttpUrl(
        process.env
          .NEXT_PUBLIC_JELLYFIN_PUBLIC_URL,
      ),

    playbackGrantSecret:
      validPlaybackGrantSecret(
        process.env
          .PAZORA_PLAYBACK_GRANT_SECRET,
      ),

    proxyAuthorizationSecret:
      configured(
        process.env
          .PAZORA_PROXY_AUTH_SECRET,
      ),
  };

  const ready =
    Object.values(
      checks,
    ).every(Boolean);

  return NextResponse.json(
    {
      service: "pazora",
      status:
        ready
          ? "ok"
          : "not_ready",
      ready,
      checks,
    },
    {
      status:
        ready
          ? 200
          : 503,
      headers:
        noStoreHeaders,
    },
  );
}