import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

import type {
  PlaybackQualityMode,
  PlaybackReportMethod,
} from "@/types/playback";

const grantAlgorithm =
  "aes-256-gcm";

const grantAad =
  Buffer.from(
    "pazora-playback-grant-v5",
    "utf8",
  );

const grantLifetimeSeconds =
  8 * 60 * 60;

export const playbackGrantQueryParam =
  "pazoraGrant";

export type PlaybackGrantClaims = {
  version: 5;
  expiresAtEpochSeconds: number;
  itemId: string;
  mediaSourceId: string;
  playSessionId: string;
  hlsMasterPath: string;
  runtimeTicks: number;
  subtitleIndexes: number[];
  burnInSubtitleStreamIndex:
    number | null;
  audioStreamIndex:
    number | null;
  qualityMode:
    PlaybackQualityMode;
  videoBitRate: number;
  maxHeight:
    number | null;
  allowVideoStreamCopy:
    boolean;
  allowAudioStreamCopy:
    boolean;
  accessToken: string;
  deviceId: string;
  reportMethod:
    PlaybackReportMethod;
};

type PlaybackGrantInput =
  Omit<
    PlaybackGrantClaims,
    "version" |
    "expiresAtEpochSeconds"
  >;

function playbackGrantKey(): Buffer {
  const configured =
    process.env
      .PAZORA_PLAYBACK_GRANT_SECRET
      ?.trim();

  if (!configured) {
    throw new Error(
      "PAZORA_PLAYBACK_GRANT_SECRET is not configured.",
    );
  }

  const key =
    Buffer.from(
      configured,
      "base64url",
    );

  if (key.length !== 32) {
    throw new Error(
      "PAZORA_PLAYBACK_GRANT_SECRET must decode to exactly 32 bytes.",
    );
  }

  return key;
}

function encodePart(
  value: Buffer,
): string {
  return value.toString(
    "base64url",
  );
}

function decodePart(
  value: string,
): Buffer {
  return Buffer.from(
    value,
    "base64url",
  );
}

function nonEmptyString(
  value: unknown,
): string | null {
  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim();
}

function nonNegativeInteger(
  value: unknown,
): number | null {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    return null;
  }

  return value;
}

function positiveInteger(
  value: unknown,
): number | null {
  const parsed =
    nonNegativeInteger(value);

  if (
    parsed === null ||
    parsed === 0
  ) {
    return null;
  }

  return parsed;
}

function nullableNonNegativeInteger(
  value: unknown,
): number | null | undefined {
  if (value === null) {
    return null;
  }

  const parsed =
    nonNegativeInteger(
      value,
    );

  return parsed === null
    ? undefined
    : parsed;
}

function nullablePositiveInteger(
  value: unknown,
): number | null | undefined {
  if (value === null) {
    return null;
  }

  const parsed =
    positiveInteger(
      value,
    );

  return parsed === null
    ? undefined
    : parsed;
}

function booleanValue(
  value: unknown,
): boolean | null {
  return typeof value === "boolean"
    ? value
    : null;
}

function playbackQualityMode(
  value: unknown,
): PlaybackQualityMode | null {
  if (
    value === "best" ||
    value === "1080p" ||
    value === "720p" ||
    value === "480p"
  ) {
    return value;
  }

  return null;
}

function reportMethod(
  value: unknown,
): PlaybackReportMethod | null {
  if (
    value === "direct-play" ||
    value === "direct-stream" ||
    value === "transcode"
  ) {
    return value;
  }

  return null;
}

function subtitleIndexes(
  value: unknown,
): number[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  if (value.length > 64) {
    return null;
  }

  const result:
    number[] = [];

  for (const item of value) {
    const parsed =
      nonNegativeInteger(item);

    if (parsed === null) {
      return null;
    }

    if (!result.includes(parsed)) {
      result.push(parsed);
    }
  }

  return result;
}

function parseClaims(
  value: unknown,
): PlaybackGrantClaims {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      "Invalid playback grant.",
    );
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  if (record.version !== 5) {
    throw new Error(
      "Invalid playback grant version.",
    );
  }

  const expiresAt =
    positiveInteger(
      record.expiresAtEpochSeconds,
    );

  if (expiresAt === null) {
    throw new Error(
      "Invalid playback grant expiry.",
    );
  }

  const now =
    Math.floor(
      Date.now() / 1000,
    );

  if (expiresAt <= now) {
    throw new Error(
      "Playback grant expired.",
    );
  }

  const itemId =
    nonEmptyString(
      record.itemId,
    );

  const mediaSourceId =
    nonEmptyString(
      record.mediaSourceId,
    );

  const playSessionId =
    nonEmptyString(
      record.playSessionId,
    );

  const hlsMasterPath =
    nonEmptyString(
      record.hlsMasterPath,
    );

  const accessToken =
    nonEmptyString(
      record.accessToken,
    );

  const deviceId =
    nonEmptyString(
      record.deviceId,
    );

  const runtimeTicks =
    positiveInteger(
      record.runtimeTicks,
    );

  const allowedSubtitleIndexes =
    subtitleIndexes(
      record.subtitleIndexes,
    );

  const selectedBurnInSubtitleStreamIndex =
    nullableNonNegativeInteger(
      record.burnInSubtitleStreamIndex,
    );

  const selectedAudioStreamIndex =
    nullableNonNegativeInteger(
      record.audioStreamIndex,
    );

  const selectedQualityMode =
    playbackQualityMode(
      record.qualityMode,
    );

  const selectedVideoBitRate =
    positiveInteger(
      record.videoBitRate,
    );

  const selectedMaxHeight =
    nullablePositiveInteger(
      record.maxHeight,
    );

  const selectedAllowVideoStreamCopy =
    booleanValue(
      record.allowVideoStreamCopy,
    );

  const selectedAllowAudioStreamCopy =
    booleanValue(
      record.allowAudioStreamCopy,
    );

  const method =
    reportMethod(
      record.reportMethod,
    );

  if (
    !itemId ||
    !mediaSourceId ||
    !playSessionId ||
    !hlsMasterPath ||
    !accessToken ||
    !deviceId ||
    runtimeTicks === null ||
    allowedSubtitleIndexes === null ||
    selectedBurnInSubtitleStreamIndex ===
      undefined ||
    selectedAudioStreamIndex ===
      undefined ||
    selectedQualityMode ===
      null ||
    selectedVideoBitRate ===
      null ||
    selectedMaxHeight ===
      undefined ||
    selectedAllowVideoStreamCopy ===
      null ||
    selectedAllowAudioStreamCopy ===
      null ||
    !method
  ) {
    throw new Error(
      "Playback grant claims are invalid.",
    );
  }

  if (
    hlsMasterPath !==
    `/Videos/${itemId}/master.m3u8`
  ) {
    throw new Error(
      "Playback grant video path is invalid.",
    );
  }

  return {
    version: 5,
    expiresAtEpochSeconds:
      expiresAt,
    itemId,
    mediaSourceId,
    playSessionId,
    hlsMasterPath,
    runtimeTicks,
    subtitleIndexes:
      allowedSubtitleIndexes,
    burnInSubtitleStreamIndex:
      selectedBurnInSubtitleStreamIndex,
    audioStreamIndex:
      selectedAudioStreamIndex,
    qualityMode:
      selectedQualityMode,
    videoBitRate:
      selectedVideoBitRate,
    maxHeight:
      selectedMaxHeight,
    allowVideoStreamCopy:
      selectedAllowVideoStreamCopy,
    allowAudioStreamCopy:
      selectedAllowAudioStreamCopy,
    accessToken,
    deviceId,
    reportMethod:
      method,
  };
}

export function issuePlaybackGrant(
  input: PlaybackGrantInput,
) {
  const now =
    Math.floor(
      Date.now() / 1000,
    );

  const claims:
    PlaybackGrantClaims = {
      version: 5,
      expiresAtEpochSeconds:
        now +
        grantLifetimeSeconds,
      ...input,
    };

  const iv =
    randomBytes(12);

  const cipher =
    createCipheriv(
      grantAlgorithm,
      playbackGrantKey(),
      iv,
    );

  cipher.setAAD(grantAad);

  const plaintext =
    Buffer.from(
      JSON.stringify(claims),
      "utf8",
    );

  const ciphertext =
    Buffer.concat([
      cipher.update(
        plaintext,
      ),
      cipher.final(),
    ]);

  const tag =
    cipher.getAuthTag();

  const grant = [
    encodePart(iv),
    encodePart(ciphertext),
    encodePart(tag),
  ].join(".");

  return {
    grant,
    expiresAt:
      new Date(
        claims
          .expiresAtEpochSeconds *
        1000,
      ).toISOString(),
  };
}

export function readPlaybackGrant(
  grant: string,
): PlaybackGrantClaims {
  const parts =
    grant.split(".");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid playback grant.",
    );
  }

  const [
    ivPart,
    ciphertextPart,
    tagPart,
  ] = parts;

  const iv =
    decodePart(ivPart);

  const ciphertext =
    decodePart(
      ciphertextPart,
    );

  const tag =
    decodePart(tagPart);

  if (
    iv.length !== 12 ||
    tag.length !== 16 ||
    ciphertext.length === 0
  ) {
    throw new Error(
      "Invalid playback grant.",
    );
  }

  const decipher =
    createDecipheriv(
      grantAlgorithm,
      playbackGrantKey(),
      iv,
    );

  decipher.setAAD(grantAad);
  decipher.setAuthTag(tag);

  const plaintext =
    Buffer.concat([
      decipher.update(
        ciphertext,
      ),
      decipher.final(),
    ]);

  const parsed: unknown =
    JSON.parse(
      plaintext.toString(
        "utf8",
      ),
    );

  return parseClaims(parsed);
}