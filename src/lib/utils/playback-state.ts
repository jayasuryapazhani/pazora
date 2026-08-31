import type {
  PlaybackReportMethod,
  PlaybackStateAction,
  PlaybackStateUpdate,
} from "@/types/playback";

type ParseResult =
  | {
      ok: true;
      value: PlaybackStateUpdate;
    }
  | {
      ok: false;
      error: string;
    };

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value =
    record[key];

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return null;
  }

  return value.trim();
}

function parseAction(
  value: unknown,
): PlaybackStateAction | null {
  if (
    value === "start" ||
    value === "progress" ||
    value === "stop"
  ) {
    return value;
  }

  return null;
}

function parseMethod(
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

function optionalStreamIndex(
  value: unknown,
): number | null | undefined {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  const parsed =
    nonNegativeInteger(value);

  return parsed === null
    ? undefined
    : parsed;
}

function optionalBoolean(
  value: unknown,
  fallback: boolean,
): boolean | null {
  if (value === undefined) {
    return fallback;
  }

  return typeof value === "boolean"
    ? value
    : null;
}

function optionalVolume(
  value: unknown,
): number | null {
  if (value === undefined) {
    return 100;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 100
  ) {
    return null;
  }

  return value;
}

export function parsePlaybackStateUpdate(
  body: unknown,
): ParseResult {
  if (!isRecord(body)) {
    return {
      ok: false,
      error:
        "Playback state body must be an object.",
    };
  }

  const action =
    parseAction(body.action);

  if (!action) {
    return {
      ok: false,
      error:
        "Playback action must be start, progress, or stop.",
    };
  }

  const itemId =
    requiredString(
      body,
      "itemId",
    );

  if (!itemId) {
    return {
      ok: false,
      error:
        "A valid itemId is required.",
    };
  }

  const playSessionId =
    requiredString(
      body,
      "playSessionId",
    );

  if (!playSessionId) {
    return {
      ok: false,
      error:
        "A valid playSessionId is required.",
    };
  }

  const mediaSourceId =
    requiredString(
      body,
      "mediaSourceId",
    );

  if (!mediaSourceId) {
    return {
      ok: false,
      error:
        "A valid mediaSourceId is required.",
    };
  }

  const positionTicks =
    nonNegativeInteger(
      body.positionTicks,
    );

  if (positionTicks === null) {
    return {
      ok: false,
      error:
        "positionTicks must be a non-negative safe integer.",
    };
  }

  const method =
    parseMethod(body.method);

  if (!method) {
    return {
      ok: false,
      error:
        "Playback method is invalid.",
    };
  }

  const canSeek =
    optionalBoolean(
      body.canSeek,
      true,
    );

  const isPaused =
    optionalBoolean(
      body.isPaused,
      false,
    );

  const isMuted =
    optionalBoolean(
      body.isMuted,
      false,
    );

  const failed =
    optionalBoolean(
      body.failed,
      false,
    );

  if (
    canSeek === null ||
    isPaused === null ||
    isMuted === null ||
    failed === null
  ) {
    return {
      ok: false,
      error:
        "Playback boolean state is invalid.",
    };
  }

  const volumeLevel =
    optionalVolume(
      body.volumeLevel,
    );

  if (volumeLevel === null) {
    return {
      ok: false,
      error:
        "volumeLevel must be an integer from 0 through 100.",
    };
  }

  const audioStreamIndex =
    optionalStreamIndex(
      body.audioStreamIndex,
    );

  const subtitleStreamIndex =
    optionalStreamIndex(
      body.subtitleStreamIndex,
    );

  if (
    audioStreamIndex === undefined ||
    subtitleStreamIndex === undefined
  ) {
    return {
      ok: false,
      error:
        "Stream indexes must be non-negative integers or null.",
    };
  }

  return {
    ok: true,
    value: {
      action,
      itemId,
      playSessionId,
      mediaSourceId,
      positionTicks,
      method,
      canSeek,
      isPaused,
      isMuted,
      volumeLevel,
      audioStreamIndex,
      subtitleStreamIndex,
      failed,
    },
  };
}