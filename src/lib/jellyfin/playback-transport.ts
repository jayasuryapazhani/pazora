import type {
  AuthenticatedJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  issuePlaybackGrant,
  playbackGrantQueryParam,
} from "@/lib/auth/playback-grant";
import type {
  PlaybackPlan,
  PlaybackReportMethod,
  PlaybackSource,
  PlaybackSubtitleOption,
} from "@/types/playback";

const ticksPerSecond =
  10_000_000;

function publicJellyfinUrl(): string {
  const configured =
    process.env
      .NEXT_PUBLIC_JELLYFIN_PUBLIC_URL
      ?.trim()
      .replace(/\/$/, "");

  if (!configured) {
    throw new Error(
      "NEXT_PUBLIC_JELLYFIN_PUBLIC_URL is not configured.",
    );
  }

  const url =
    new URL(configured);

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "NEXT_PUBLIC_JELLYFIN_PUBLIC_URL must use HTTP or HTTPS.",
    );
  }

  return url.toString()
    .replace(/\/$/, "");
}

function selectedSource(
  playback: PlaybackPlan,
): PlaybackSource | null {
  if (
    playback.preferredSourceId
  ) {
    const preferred =
      playback.sources.find(
        (source) =>
          source.id ===
          playback
            .preferredSourceId,
      );

    if (preferred) {
      return preferred;
    }
  }

  return (
    playback.sources[0] ??
    null
  );
}

function selectedAudioIndex(
  source: PlaybackSource,
): number | null {
  return (
    source
      .defaultAudioStreamIndex ??
    source.audioTracks[0]
      ?.index ??
    null
  );
}

function normalizedCodec(
  codec: string | null | undefined,
): string {
  return (
    codec
      ?.trim()
      .toLowerCase() ??
    ""
  );
}

function playbackReportMethod(
  source: PlaybackSource,
): PlaybackReportMethod {
  const videoCodec =
    normalizedCodec(
      source
        .videoTracks[0]
        ?.codec,
    );

  const audioIndex =
    selectedAudioIndex(
      source,
    );

  const audioCodec =
    normalizedCodec(
      source.audioTracks.find(
        (track) =>
          track.index ===
          audioIndex,
      )?.codec ??
      source.audioTracks[0]
        ?.codec,
    );

  const copiesVideo =
    videoCodec === "h264";

  const copiesAudio =
    audioCodec === "aac";

  return (
    copiesVideo &&
    copiesAudio
  )
    ? "direct-stream"
    : "transcode";
}

function normalizedStartPosition(
  resumePositionTicks: number,
  runtimeTicks: number,
): number {
  if (
    resumePositionTicks <
      5 * ticksPerSecond ||
    resumePositionTicks >=
      runtimeTicks -
        10 * ticksPerSecond
  ) {
    return 0;
  }

  return Math.min(
    resumePositionTicks,
    runtimeTicks,
  );
}

function textSubtitleIndexes(
  source: PlaybackSource,
): number[] {
  return source.subtitleTracks
    .filter(
      (track) =>
        track.isTextSubtitle &&
        track.index !== null,
    )
    .map(
      (track) =>
        track.index as number,
    );
}

function defaultTextSubtitleIndex(
  source: PlaybackSource,
  indexes: number[],
): number | null {
  const configured =
    source
      .defaultSubtitleStreamIndex;

  if (
    configured !== null &&
    indexes.includes(configured)
  ) {
    return configured;
  }

  const defaultTrack =
    source.subtitleTracks.find(
      (track) =>
        track.isTextSubtitle &&
        track.isDefault &&
        track.index !== null,
    );

  return (
    defaultTrack?.index ??
    null
  );
}

function subtitleOptions(
  publicUrl: string,
  playback: PlaybackPlan,
  source: PlaybackSource,
  initialPositionTicks: number,
  grant: string,
): PlaybackSubtitleOption[] {
  return source.subtitleTracks
    .filter(
      (track) =>
        track.isTextSubtitle &&
        track.index !== null,
    )
    .map(
      (track) => {
        const index =
          track.index as number;

        const subtitleUrl =
          new URL(
            `/Videos/${playback.itemId}/${source.id}/Subtitles/${index}/${initialPositionTicks}/Stream.vtt`,
            `${publicUrl}/`,
          );

        subtitleUrl.searchParams.set(
          playbackGrantQueryParam,
          grant,
        );

        return {
          index,
          label:
            track.displayTitle ??
            track.language ??
            `Subtitle ${index}`,
          language:
            track.language,
          isDefault:
            track.isDefault,
          isForced:
            track.isForced,
          streamUrl:
            subtitleUrl.toString(),
        };
      },
    );
}

export function attachPlaybackTransport(
  context: AuthenticatedJellyfinContext,
  playback: PlaybackPlan,
): PlaybackPlan {
  const source =
    selectedSource(
      playback,
    );

  if (
    !source ||
    !source.id
  ) {
    return {
      ...playback,
      transport: {
        ready: false,
        strategy:
          "secure-direct-jellyfin",
        mediaBytesViaVercel:
          false,
        browserCompatibilityNegotiated:
          false,
        reason:
          "Jellyfin did not return a usable media source.",
      },
    };
  }

  if (!playback.playSessionId) {
    return {
      ...playback,
      transport: {
        ready: false,
        strategy:
          "secure-direct-jellyfin",
        mediaBytesViaVercel:
          false,
        browserCompatibilityNegotiated:
          false,
        reason:
          "Jellyfin did not return a playback session.",
      },
    };
  }

  if (
    source.runtimeTicks === null ||
    source.runtimeTicks <= 0
  ) {
    return {
      ...playback,
      transport: {
        ready: false,
        strategy:
          "secure-direct-jellyfin",
        mediaBytesViaVercel:
          false,
        browserCompatibilityNegotiated:
          false,
        reason:
          "Jellyfin did not return a valid media runtime.",
      },
    };
  }

  const runtimeTicks =
    source.runtimeTicks;

  const initialPositionTicks =
    normalizedStartPosition(
      playback.resumePositionTicks,
      runtimeTicks,
    );

  const method =
    playbackReportMethod(
      source,
    );

  const subtitleIndexes =
    textSubtitleIndexes(
      source,
    );

  const hlsMasterPath =
    `/Videos/${playback.itemId}/master.m3u8`;

  const issued =
    issuePlaybackGrant({
      itemId:
        playback.itemId,
      mediaSourceId:
        source.id,
      playSessionId:
        playback.playSessionId,
      hlsMasterPath,
      runtimeTicks,
      subtitleIndexes,
      accessToken:
        context.accessToken,
      deviceId:
        context.deviceId,
      reportMethod:
        method,
    });

  const publicUrl =
    publicJellyfinUrl();

  const stream =
    new URL(
      hlsMasterPath,
      `${publicUrl}/`,
    );

  const audioStreamIndex =
    selectedAudioIndex(
      source,
    );

  const videoCodec =
    normalizedCodec(
      source
        .videoTracks[0]
        ?.codec,
    );

  const audioCodec =
    normalizedCodec(
      source.audioTracks.find(
        (track) =>
          track.index ===
          audioStreamIndex,
      )?.codec ??
      source.audioTracks[0]
        ?.codec,
    );

  stream.searchParams.set(
    "static",
    "false",
  );

  stream.searchParams.set(
    "mediaSourceId",
    source.id,
  );

  stream.searchParams.set(
    "playSessionId",
    playback.playSessionId,
  );

  // Jellyfin 10.11.11 copies this query into every generated
  // HLS segment URL. Dynamic segment requests explicitly reject
  // positive StartTimeTicks, so HLS always exposes the full VOD
  // timeline and HLS.js owns resume/seek positioning.
  stream.searchParams.set(
    "startTimeTicks",
    "0",
  );

  stream.searchParams.set(
    "videoCodec",
    "h264",
  );

  stream.searchParams.set(
    "audioCodec",
    "aac",
  );

  stream.searchParams.set(
    "enableAutoStreamCopy",
    "true",
  );

  stream.searchParams.set(
    "allowVideoStreamCopy",
    videoCodec === "h264"
      ? "true"
      : "false",
  );

  stream.searchParams.set(
    "allowAudioStreamCopy",
    audioCodec === "aac"
      ? "true"
      : "false",
  );

  stream.searchParams.set(
    "maxAudioChannels",
    "6",
  );

  stream.searchParams.set(
    "audioBitRate",
    "384000",
  );

  stream.searchParams.set(
    "videoBitRate",
    "20000000",
  );

  stream.searchParams.set(
    "requireAvc",
    "true",
  );

  // Text subtitles are delivered separately as WebVTT.
  // Never trigger subtitle burn-in in the baseline path.
  stream.searchParams.set(
    "subtitleStreamIndex",
    "-1",
  );

  if (
    audioStreamIndex !== null
  ) {
    stream.searchParams.set(
      "audioStreamIndex",
      String(
        audioStreamIndex,
      ),
    );
  }

  stream.searchParams.set(
    "segmentContainer",
    "mp4",
  );

  stream.searchParams.set(
    "minSegments",
    "1",
  );

  stream.searchParams.set(
    "breakOnNonKeyFrames",
    "false",
  );

  stream.searchParams.set(
    "enableAdaptiveBitrateStreaming",
    "false",
  );

  stream.searchParams.set(
    "enableTrickplay",
    "false",
  );


  return {
    ...playback,
    transport: {
      ready: true,
      strategy:
        "secure-direct-jellyfin",
      authorization:
        "encrypted-item-grant+caddy-forward-auth",
      mediaBytesViaVercel:
        false,
      compatibilityMode:
        "hls-h264-aac",
      streamUrl:
        stream.toString(),
      requestGrant:
        issued.grant,
      expiresAt:
        issued.expiresAt,
      segmentContainer:
        "mp4",
      videoCodec:
        "h264",
      audioCodec:
        "aac",
      reportMethod:
        method,
      audioStreamIndex,
      runtimeTicks,
      initialPositionTicks,
      defaultSubtitleStreamIndex:
        defaultTextSubtitleIndex(
          source,
          subtitleIndexes,
        ),
      subtitleTracks:
        subtitleOptions(
          publicUrl,
          playback,
          source,
          0,
          issued.grant,
        ),
    },
  };
}