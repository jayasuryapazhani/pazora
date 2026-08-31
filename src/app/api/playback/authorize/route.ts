import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextResponse,
} from "next/server";

import {
  playbackGrantQueryParam,
  readPlaybackGrant,
  type PlaybackGrantClaims,
} from "@/lib/auth/playback-grant";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const noStoreHeaders = {
  "Cache-Control":
    "private, no-store",
} as const;

function equalSecret(
  provided: string,
  expected: string,
): boolean {
  const left =
    Buffer.from(
      provided,
      "utf8",
    );

  const right =
    Buffer.from(
      expected,
      "utf8",
    );

  if (
    left.length !==
    right.length
  ) {
    return false;
  }

  return timingSafeEqual(
    left,
    right,
  );
}

function pathInteger(
  value: string,
): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed =
    Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
}

function validStartTicks(
  value: string | null,
  runtimeTicks: number,
): boolean {
  if (value === null) {
    return false;
  }

  const parsed =
    pathInteger(value);

  return (
    parsed !== null &&
    parsed <= runtimeTicks
  );
}

function exactOptionalIntegerQuery(
  original: URL,
  key: string,
  expected:
    number | null,
): boolean {
  const actual =
    original.searchParams.get(
      key,
    );

  if (expected === null) {
    return actual === null;
  }

  return actual ===
    String(expected);
}

function validSubtitleProfileQuery(
  original: URL,
  claims: PlaybackGrantClaims,
): boolean {
  const subtitleStreamIndex =
    original.searchParams.get(
      "subtitleStreamIndex",
    );

  const subtitleMethod =
    original.searchParams.get(
      "subtitleMethod",
    );

  if (
    claims
      .burnInSubtitleStreamIndex ===
    null
  ) {
    return (
      subtitleStreamIndex === "-1" &&
      subtitleMethod === null
    );
  }

  return (
    subtitleStreamIndex ===
      String(
        claims
          .burnInSubtitleStreamIndex,
      ) &&
    subtitleMethod === "Encode" &&
    claims.allowVideoStreamCopy ===
      false
  );
}

function validTransportProfileQuery(
  original: URL,
  claims: PlaybackGrantClaims,
): boolean {
  if (
    original.searchParams.get(
      "static",
    ) !== "false" ||
    original.searchParams.get(
      "videoCodec",
    ) !== "h264" ||
    original.searchParams.get(
      "audioCodec",
    ) !== "aac" ||
    original.searchParams.get(
      "segmentContainer",
    ) !== "mp4" ||
    original.searchParams.get(
      "startTimeTicks",
    ) !== "0" ||
    original.searchParams.get(
      "enableAutoStreamCopy",
    ) !== "true" ||
    original.searchParams.get(
      "allowVideoStreamCopy",
    ) !==
      String(
        claims
          .allowVideoStreamCopy,
      ) ||
    original.searchParams.get(
      "allowAudioStreamCopy",
    ) !==
      String(
        claims
          .allowAudioStreamCopy,
      ) ||
    original.searchParams.get(
      "maxAudioChannels",
    ) !== "6" ||
    original.searchParams.get(
      "audioBitRate",
    ) !== "384000" ||
    original.searchParams.get(
      "videoBitRate",
    ) !==
      String(
        claims.videoBitRate,
      ) ||
    original.searchParams.get(
      "requireAvc",
    ) !== "true" ||
    original.searchParams.get(
      "minSegments",
    ) !== "1" ||
    original.searchParams.get(
      "breakOnNonKeyFrames",
    ) !== "false" ||
    original.searchParams.get(
      "enableAdaptiveBitrateStreaming",
    ) !== "false" ||
    original.searchParams.get(
      "enableTrickplay",
    ) !== "false"
  ) {
    return false;
  }

  if (
    !validSubtitleProfileQuery(
      original,
      claims,
    )
  ) {
    return false;
  }

  if (
    !exactOptionalIntegerQuery(
      original,
      "audioStreamIndex",
      claims.audioStreamIndex,
    ) ||
    !exactOptionalIntegerQuery(
      original,
      "maxHeight",
      claims.maxHeight,
    )
  ) {
    return false;
  }

  return validStartTicks(
    original.searchParams.get(
      "startTimeTicks",
    ),
    claims.runtimeTicks,
  );
}

function validMasterRequest(
  original: URL,
  claims: PlaybackGrantClaims,
): boolean {
  if (
    original.pathname !==
    claims.hlsMasterPath
  ) {
    return false;
  }

  if (
    original.searchParams.get(
      "mediaSourceId",
    ) !== claims.mediaSourceId ||
    original.searchParams.get(
      "playSessionId",
    ) !== claims.playSessionId
  ) {
    return false;
  }

  return validTransportProfileQuery(
    original,
    claims,
  );
}

function normalizedGuidValue(
  value: string,
): string | null {
  const normalized =
    value
      .trim()
      .toLowerCase()
      .replaceAll(
        "-",
        "",
      );

  if (
    !/^[0-9a-f]{32}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  return normalized;
}

function matchingItemId(
  candidate: string,
  claims: PlaybackGrantClaims,
): boolean {
  const left =
    normalizedGuidValue(
      candidate,
    );

  const right =
    normalizedGuidValue(
      claims.itemId,
    );

  return (
    left !== null &&
    right !== null &&
    left === right
  );
}

function matchingOptionalSessionQuery(
  original: URL,
  claims: PlaybackGrantClaims,
): boolean {
  const mediaSourceId =
    original.searchParams.get(
      "mediaSourceId",
    );

  const playSessionId =
    original.searchParams.get(
      "playSessionId",
    );

  if (
    mediaSourceId !== null &&
    mediaSourceId !==
      claims.mediaSourceId
  ) {
    return false;
  }

  if (
    playSessionId !== null &&
    playSessionId !==
      claims.playSessionId
  ) {
    return false;
  }

  const startTimeTicks =
    original.searchParams.get(
      "startTimeTicks",
    );

  if (
    startTimeTicks !== null &&
    !validStartTicks(
      startTimeTicks,
      claims.runtimeTicks,
    )
  ) {
    return false;
  }

  return true;
}

function validHlsChildRequest(
  original: URL,
  claims: PlaybackGrantClaims,
): boolean {
  // The master request is profile-bound by the encrypted grant.
  // Jellyfin is then allowed to normalize the generated child
  // playlist/segment query for codec, HDR and transcoding details.
  //
  // Child authorization remains constrained below by:
  // - encrypted item grant
  // - exact item identity
  // - media-source/session identity when present
  // - approved HLS child path
  // - valid start/runtime/segment timing
  //
  // Requiring byte-for-byte master profile equality here rejects
  // legitimate Jellyfin-generated HDR/HEVC child resources.
  const path =
    original.pathname;

  const mainMatch =
    /^\/videos\/([0-9a-f-]+)\/main\.m3u8$/i
      .exec(path);

  if (mainMatch) {
    return (
      matchingItemId(
        mainMatch[1],
        claims,
      ) &&
      matchingOptionalSessionQuery(
        original,
        claims,
      )
    );
  }

  const segmentMatch =
    /^\/videos\/([0-9a-f-]+)\/hls[0-9]+\/main\/(-?[0-9]+)\.mp4$/i
      .exec(path);

  if (!segmentMatch) {
    return false;
  }

  if (
    !matchingItemId(
      segmentMatch[1],
      claims,
    )
  ) {
    return false;
  }

  const segmentNumber =
    Number(
      segmentMatch[2],
    );

  if (
    !Number.isSafeInteger(
      segmentNumber,
    ) ||
    segmentNumber < -1
  ) {
    return false;
  }

  if (
    !matchingOptionalSessionQuery(
      original,
      claims,
    )
  ) {
    return false;
  }

  const runtimeTicks =
    original.searchParams.get(
      "runtimeTicks",
    );

  const actualSegmentLengthTicks =
    original.searchParams.get(
      "actualSegmentLengthTicks",
    );

  if (
    runtimeTicks === null ||
    actualSegmentLengthTicks === null
  ) {
    return false;
  }

  return (
    pathInteger(
      runtimeTicks,
    ) !== null &&
    pathInteger(
      actualSegmentLengthTicks,
    ) !== null
  );
}

function validSubtitleRequest(
  original: URL,
  claims: PlaybackGrantClaims,
): boolean {
  const prefix =
    `/Videos/${claims.itemId}/${claims.mediaSourceId}/Subtitles/`;

  if (
    !original.pathname.startsWith(
      prefix,
    )
  ) {
    return false;
  }

  const remainder =
    original.pathname.slice(
      prefix.length,
    );

  const parts =
    remainder.split("/");

  if (
    parts.length !== 3 ||
    parts[2] !== "Stream.vtt"
  ) {
    return false;
  }

  const index =
    pathInteger(parts[0]);

  const startTicks =
    pathInteger(parts[1]);

  if (
    index === null ||
    startTicks === null ||
    startTicks >
      claims.runtimeTicks
  ) {
    return false;
  }

  return claims.subtitleIndexes
    .includes(index);
}

export async function GET(
  request: Request,
) {
  const expectedSecret =
    process.env
      .PAZORA_PROXY_AUTH_SECRET
      ?.trim();

  if (!expectedSecret) {
    return NextResponse.json(
      {
        error:
          "Playback proxy authorization is not configured.",
      },
      {
        status: 503,
        headers:
          noStoreHeaders,
      },
    );
  }

  const providedSecret =
    request.headers.get(
      "x-pazora-proxy-secret",
    ) ?? "";

  if (
    !equalSecret(
      providedSecret,
      expectedSecret,
    )
  ) {
    return NextResponse.json(
      {
        error: "Forbidden.",
      },
      {
        status: 403,
        headers:
          noStoreHeaders,
      },
    );
  }

  const forwardedMethod =
    request.headers
      .get(
        "x-forwarded-method",
      )
      ?.toUpperCase();

  if (
    forwardedMethod !== "GET" &&
    forwardedMethod !== "HEAD"
  ) {
    return NextResponse.json(
      {
        error:
          "Unsupported media request method.",
      },
      {
        status: 405,
        headers:
          noStoreHeaders,
      },
    );
  }

  const forwardedUri =
    request.headers.get(
      "x-forwarded-uri",
    );

  if (!forwardedUri) {
    return NextResponse.json(
      {
        error:
          "Missing media request URI.",
      },
      {
        status: 400,
        headers:
          noStoreHeaders,
      },
    );
  }

  let original: URL;

  try {
    original =
      new URL(
        forwardedUri,
        "http://pazora.internal",
      );
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid media request URI.",
      },
      {
        status: 400,
        headers:
          noStoreHeaders,
      },
    );
  }

  const grant =
    original.searchParams.get(
      playbackGrantQueryParam,
    ) ??
    request.headers.get(
      "x-pazora-grant",
    );

  if (!grant) {
    return NextResponse.json(
      {
        error:
          "Playback authorization required.",
      },
      {
        status: 401,
        headers:
          noStoreHeaders,
      },
    );
  }

  let claims:
    PlaybackGrantClaims;

  try {
    claims =
      readPlaybackGrant(
        grant,
      );
  } catch {
    return NextResponse.json(
      {
        error:
          "Playback authorization is invalid or expired.",
      },
      {
        status: 401,
        headers:
          noStoreHeaders,
      },
    );
  }

  const permitted =
    validMasterRequest(
      original,
      claims,
    ) ||
    validHlsChildRequest(
      original,
      claims,
    ) ||
    validSubtitleRequest(
      original,
      claims,
    );

  if (!permitted) {
    return NextResponse.json(
      {
        error:
          "Playback authorization does not permit this resource.",
      },
      {
        status: 403,
        headers:
          noStoreHeaders,
      },
    );
  }

  return new NextResponse(
    null,
    {
      status: 204,
      headers: {
        ...noStoreHeaders,
        "X-Pazora-Jellyfin-Token":
          claims.accessToken,
        "X-Pazora-Device-Id":
          claims.deviceId,
      },
    },
  );
}