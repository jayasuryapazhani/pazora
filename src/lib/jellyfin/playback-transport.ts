import type {
  AuthenticatedJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  issuePlaybackGrant,
  playbackGrantQueryParam,
} from "@/lib/auth/playback-grant";
import type {
  PlaybackAudioOption,
  PlaybackPlan,
  PlaybackQualityMode,
  PlaybackQualityOption,
  PlaybackReportMethod,
  PlaybackSource,
  PlaybackSubtitleOption,
  PlaybackTransportPreferences,
} from "@/types/playback";

const ticksPerSecond =
  10_000_000;

const maximumNativeVideoBitRate =
  160_000_000;

const constrainedQualityPresets:
  PlaybackQualityOption[] = [
    {
      mode: "1080p",
      label: "1080p",
      maxHeight: 1080,
      videoBitRate:
        8_000_000,
    },
    {
      mode: "720p",
      label: "720p",
      maxHeight: 720,
      videoBitRate:
        4_000_000,
    },
    {
      mode: "480p",
      label: "480p",
      maxHeight: 480,
      videoBitRate:
        2_000_000,
    },
  ];

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
  requested:
    number | null | undefined,
): number | null {
  if (
    requested !== null &&
    requested !== undefined &&
    source.audioTracks.some(
      (track) =>
        track.index === requested,
    )
  ) {
    return requested;
  }

  return (
    source
      .defaultAudioStreamIndex ??
    source.audioTracks[0]
      ?.index ??
    null
  );
}

function audioOptions(
  source: PlaybackSource,
): PlaybackAudioOption[] {
  return source.audioTracks
    .filter(
      (
        track,
      ): track is typeof track & {
        index: number;
      } =>
        track.index !== null,
    )
    .map(
      (track) => ({
        index: track.index,
        label:
          track.displayTitle ??
          track.language ??
          `Audio ${track.index}`,
        language:
          track.language,
        codec:
          track.codec,
        channels:
          track.channels,
        isDefault:
          track.isDefault,
      }),
    );
}

function maximumVideoDimension(
  source: PlaybackSource,
  dimension:
    "width" | "height",
): number | null {
  const values =
    source.videoTracks
      .map(
        (track) =>
          track[dimension],
      )
      .filter(
        (
          value,
        ): value is number =>
          value !== null &&
          value > 0,
      );

  if (values.length === 0) {
    return null;
  }

  return Math.max(
    ...values,
  );
}

function sourceQualityTier(
  source: PlaybackSource,
): {
  label: string;
  nominalHeight: number;
  bitrateFloor: number;
} | null {
  const width =
    maximumVideoDimension(
      source,
      "width",
    ) ?? 0;

  const height =
    maximumVideoDimension(
      source,
      "height",
    ) ?? 0;

  // Use the source resolution envelope, not raw encoded height.
  // Cinemascope releases are commonly cropped:
  // 3840x1600 / 3840x1920 are still 4K-class sources,
  // while 1920x800 is still a 1080p-class source.
  if (
    width >= 3840 ||
    height >= 2160
  ) {
    return {
      label: "4K",
      nominalHeight: 2160,
      bitrateFloor:
        40_000_000,
    };
  }

  if (
    width >= 1920 ||
    height >= 1080
  ) {
    return {
      label: "1080p",
      nominalHeight: 1080,
      bitrateFloor:
        20_000_000,
    };
  }

  if (
    width >= 1280 ||
    height >= 720
  ) {
    return {
      label: "720p",
      nominalHeight: 720,
      bitrateFloor:
        10_000_000,
    };
  }

  if (
    width >= 854 ||
    height >= 480
  ) {
    return {
      label: "480p",
      nominalHeight: 480,
      bitrateFloor:
        5_000_000,
    };
  }

  return null;
}

function qualityOptions(
  source: PlaybackSource,
): PlaybackQualityOption[] {
  const tier =
    sourceQualityTier(
      source,
    );

  const sourceBitRate =
    Math.max(
      0,
      source.bitrate ?? 0,
    );

  const nativeVideoBitRate =
    Math.min(
      maximumNativeVideoBitRate,
      Math.max(
        tier?.bitrateFloor ??
          5_000_000,
        sourceBitRate,
      ),
    );

  const options:
    PlaybackQualityOption[] = [
      {
        // "best" remains the internal native/original profile.
        // The UI exposes the actual consumer quality tier.
        mode: "best",
        label:
          tier?.label ??
          "Best",
        maxHeight: null,
        videoBitRate:
          nativeVideoBitRate,
      },
    ];

  if (!tier) {
    return options;
  }

  for (
    const preset of
    constrainedQualityPresets
  ) {
    if (
      preset.maxHeight !== null &&
      tier.nominalHeight >
        preset.maxHeight
    ) {
      options.push(
        preset,
      );
    }
  }

  return options;
}

function selectedQuality(
  options:
    PlaybackQualityOption[],
  requested:
    PlaybackQualityMode |
    undefined,
): PlaybackQualityOption {
  const selected =
    requested
      ? options.find(
          (option) =>
            option.mode ===
            requested,
        )
      : null;

  return (
    selected ??
    options[0]
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
  copiesVideo: boolean,
  copiesAudio: boolean,
): PlaybackReportMethod {
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

function selectedSubtitleIndex(
  source: PlaybackSource,
  textIndexes: number[],
  requested:
    number | null | undefined,
): number | null {
  if (requested === undefined) {
    return defaultTextSubtitleIndex(
      source,
      textIndexes,
    );
  }

  if (requested === null) {
    return null;
  }

  return source.subtitleTracks.some(
    (track) =>
      track.index === requested,
  )
    ? requested
    : null;
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
      (
        track,
      ): track is typeof track & {
        index: number;
      } =>
        track.index !== null,
    )
    .map(
      (track) => {
        let streamUrl:
          string | null =
          null;

        if (track.isTextSubtitle) {
          const subtitleUrl =
            new URL(
              `/Videos/${playback.itemId}/${source.id}/Subtitles/${track.index}/${initialPositionTicks}/Stream.vtt`,
              `${publicUrl}/`,
            );

          subtitleUrl.searchParams.set(
            playbackGrantQueryParam,
            grant,
          );

          streamUrl =
            subtitleUrl.toString();
        }

        return {
          index:
            track.index,
          label:
            track.displayTitle ??
            track.language ??
            `Subtitle ${track.index}`,
          language:
            track.language,
          codec:
            track.codec,
          isDefault:
            track.isDefault,
          isForced:
            track.isForced,
          delivery:
            track.isTextSubtitle
              ? "external"
              : "burn-in",
          streamUrl,
        };
      },
    );
}

export function attachPlaybackTransport(
  context: AuthenticatedJellyfinContext,
  playback: PlaybackPlan,
  preferences:
    PlaybackTransportPreferences = {},
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
      preferences.positionTicks ??
        playback.resumePositionTicks,
      runtimeTicks,
    );

  const availableAudioOptions =
    audioOptions(
      source,
    );

  const audioStreamIndex =
    selectedAudioIndex(
      source,
      preferences
        .audioStreamIndex,
    );

  const availableQualityOptions =
    qualityOptions(
      source,
    );

  const quality =
    selectedQuality(
      availableQualityOptions,
      preferences
        .qualityMode,
    );

  const externalSubtitleIndexes =
    textSubtitleIndexes(
      source,
    );

  const selectedSubtitleStreamIndex =
    selectedSubtitleIndex(
      source,
      externalSubtitleIndexes,
      preferences
        .subtitleStreamIndex,
    );

  const selectedSubtitleTrack =
    selectedSubtitleStreamIndex ===
      null
      ? null
      : source.subtitleTracks.find(
          (track) =>
            track.index ===
            selectedSubtitleStreamIndex,
        ) ??
        null;

  const burnInSubtitleStreamIndex =
    selectedSubtitleTrack &&
    !selectedSubtitleTrack
      .isTextSubtitle
      ? selectedSubtitleStreamIndex
      : null;

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

  const allowVideoStreamCopy =
    burnInSubtitleStreamIndex ===
      null &&
    quality.mode === "best" &&
    videoCodec === "h264";

  const allowAudioStreamCopy =
    audioCodec === "aac";

  const method =
    playbackReportMethod(
      allowVideoStreamCopy,
      allowAudioStreamCopy,
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
      subtitleIndexes:
        externalSubtitleIndexes,
      burnInSubtitleStreamIndex,
      audioStreamIndex,
      qualityMode:
        quality.mode,
      videoBitRate:
        quality.videoBitRate,
      maxHeight:
        quality.maxHeight,
      allowVideoStreamCopy,
      allowAudioStreamCopy,
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
    allowVideoStreamCopy
      ? "true"
      : "false",
  );

  stream.searchParams.set(
    "allowAudioStreamCopy",
    allowAudioStreamCopy
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
    String(
      quality.videoBitRate,
    ),
  );

  if (
    quality.maxHeight !== null
  ) {
    stream.searchParams.set(
      "maxHeight",
      String(
        quality.maxHeight,
      ),
    );
  }

  stream.searchParams.set(
    "requireAvc",
    "true",
  );

  if (
    burnInSubtitleStreamIndex !==
    null
  ) {
    // Bitmap subtitles such as PGS/VobSub cannot be rendered
    // by the browser's WebVTT track. Jellyfin composites them
    // into the video when SubtitleMethod=Encode is selected.
    stream.searchParams.set(
      "subtitleStreamIndex",
      String(
        burnInSubtitleStreamIndex,
      ),
    );

    stream.searchParams.set(
      "subtitleMethod",
      "Encode",
    );
  } else {
    // Text subtitles remain external WebVTT and do not force
    // a video transcode.
    stream.searchParams.set(
      "subtitleStreamIndex",
      "-1",
    );
  }

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
      audioOptions:
        availableAudioOptions,
      qualityMode:
        quality.mode,
      qualityOptions:
        availableQualityOptions,
      runtimeTicks,
      initialPositionTicks,
      subtitleStreamIndex:
        selectedSubtitleStreamIndex,
      defaultSubtitleStreamIndex:
        defaultTextSubtitleIndex(
          source,
          externalSubtitleIndexes,
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