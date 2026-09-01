import {
  NextRequest,
} from "next/server";

function firstHeaderValue(
  value: string | null,
) {
  return value
    ?.split(",")[0]
    ?.trim();
}

export function getPublicOrigin(
  request: NextRequest,
) {
  const forwardedHost =
    firstHeaderValue(
      request.headers.get(
        "x-forwarded-host",
      ),
    );

  const requestHost =
    request.headers
      .get("host")
      ?.trim();

  const host =
    forwardedHost ||
    requestHost ||
    request.nextUrl.host;

  const forwardedProtocol =
    firstHeaderValue(
      request.headers.get(
        "x-forwarded-proto",
      ),
    );

  const fallbackProtocol =
    request.nextUrl.protocol
      .replace(/:$/, "");

  const protocol =
    (
      forwardedProtocol ||
      fallbackProtocol
    ).toLowerCase();

  if (
    !host ||
    !["http", "https"].includes(
      protocol,
    )
  ) {
    throw new Error(
      "Unable to determine the public Pazora origin.",
    );
  }

  return `${protocol}://${host}`;
}