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

async function jellyfinReachable(): Promise<boolean> {
  const configured =
    process.env
      .JELLYFIN_SERVER_URL
      ?.trim()
      .replace(/\/$/, "");

  if (!configured) {
    return false;
  }

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => {
        controller.abort();
      },
      3000,
    );

  try {
    const response =
      await fetch(
        `${configured}/System/Info/Public`,
        {
          method: "GET",
          cache: "no-store",
          signal:
            controller.signal,
          headers: {
            Accept:
              "application/json",
          },
        },
      );

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  request: Request,
) {
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

  const configuredReady =
    Object.values(
      checks,
    ).every(Boolean);

  const url =
    new URL(
      request.url,
    );

  const deep =
    url.searchParams.get(
      "deep",
    ) === "1";

  const reachable =
    deep &&
    configuredReady
      ? await jellyfinReachable()
      : null;

  const ready =
    configuredReady &&
    (!deep || reachable === true);

  return NextResponse.json(
    {
      service: "pazora",
      status:
        ready
          ? "ok"
          : "not_ready",
      ready,
      mode:
        deep
          ? "deep"
          : "config",
      checks: {
        ...checks,
        ...(deep
          ? {
              jellyfinReachable:
                reachable === true,
            }
          : {}),
      },
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