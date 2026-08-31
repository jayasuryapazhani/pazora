import {
  getMediaInfoApi,
} from "@jellyfin/sdk/lib/utils/api/media-info-api.js";
import {
  getPlaystateApi,
} from "@jellyfin/sdk/lib/utils/api/playstate-api.js";
import {
  PlayMethod,
} from "@jellyfin/sdk/lib/generated-client/models/play-method.js";
import type {
  MediaSourceInfo,
} from "@jellyfin/sdk/lib/generated-client/models/media-source-info.js";
import type {
  MediaStream,
} from "@jellyfin/sdk/lib/generated-client/models/media-stream.js";

import type {
  AuthenticatedJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  createAuthenticatedJellyfinApi,
} from "@/lib/jellyfin/server";
import type {
  PlaybackMethod,
  PlaybackPlan,
  PlaybackReportMethod,
  PlaybackSource,
  PlaybackStateUpdate,
  PlaybackTrack,
  PlaybackTrackKind,
} from "@/types/playback";

function normalizedString(
  value: string | null | undefined,
): string | null {
  const normalized =
    value?.trim();

  return normalized
    ? normalized
    : null;
}

function trackKind(
  stream: MediaStream,
): PlaybackTrackKind {
  const type =
    String(
      stream.Type ?? "",
    ).toLowerCase();

  if (type === "video") {
    return "video";
  }

  if (type === "audio") {
    return "audio";
  }

  if (type === "subtitle") {
    return "subtitle";
  }

  return "other";
}

function normalizeTrack(
  stream: MediaStream,
): PlaybackTrack {
  return {
    index:
      stream.Index ?? null,
    kind:
      trackKind(stream),
    codec:
      normalizedString(
        stream.Codec,
      ),
    language:
      normalizedString(
        stream.Language,
      ),
    displayTitle:
      normalizedString(
        stream.DisplayTitle,
      ),
    isDefault:
      stream.IsDefault ?? false,
    isForced:
      stream.IsForced ?? false,
    isExternal:
      stream.IsExternal ?? false,
    isTextSubtitle:
      stream.IsTextSubtitleStream ??
      false,
    channels:
      stream.Channels ?? null,
    width:
      stream.Width ?? null,
    height:
      stream.Height ?? null,
  };
}

function serverMethod(
  source: MediaSourceInfo,
): PlaybackMethod {
  if (
    source.SupportsDirectPlay ===
    true
  ) {
    return "direct-play";
  }

  if (
    source.SupportsDirectStream ===
    true
  ) {
    return "direct-stream";
  }

  if (
    source.SupportsTranscoding ===
    true
  ) {
    return "transcode";
  }

  return "unsupported";
}

function normalizeSource(
  source: MediaSourceInfo,
): PlaybackSource {
  const tracks =
    (source.MediaStreams ?? [])
      .map(normalizeTrack);

  return {
    id:
      normalizedString(
        source.Id,
      ),
    name:
      normalizedString(
        source.Name,
      ),
    container:
      normalizedString(
        source.Container,
      ),
    protocol:
      source.Protocol
        ? String(source.Protocol)
        : null,
    runtimeTicks:
      source.RunTimeTicks ?? null,
    bitrate:
      source.Bitrate ?? null,
    defaultAudioStreamIndex:
      source.DefaultAudioStreamIndex ??
      null,
    defaultSubtitleStreamIndex:
      source.DefaultSubtitleStreamIndex ??
      null,
    supportsDirectPlay:
      source.SupportsDirectPlay ??
      false,
    supportsDirectStream:
      source.SupportsDirectStream ??
      false,
    supportsTranscoding:
      source.SupportsTranscoding ??
      false,
    serverPreferredMethod:
      serverMethod(source),
    videoTracks:
      tracks.filter(
        (track) =>
          track.kind === "video",
      ),
    audioTracks:
      tracks.filter(
        (track) =>
          track.kind === "audio",
      ),
    subtitleTracks:
      tracks.filter(
        (track) =>
          track.kind ===
          "subtitle",
      ),
  };
}

function methodRank(
  method: PlaybackMethod,
): number {
  switch (method) {
    case "direct-play":
      return 0;

    case "direct-stream":
      return 1;

    case "transcode":
      return 2;

    case "unsupported":
      return 3;
  }
}

function preferredSource(
  sources: PlaybackSource[],
): PlaybackSource | null {
  if (sources.length === 0) {
    return null;
  }

  return (
    [...sources].sort(
      (left, right) =>
        methodRank(
          left.serverPreferredMethod,
        ) -
        methodRank(
          right.serverPreferredMethod,
        ),
    )[0] ?? null
  );
}

function jellyfinPlayMethod(
  method: PlaybackReportMethod,
) {
  switch (method) {
    case "direct-play":
      return PlayMethod.DirectPlay;

    case "direct-stream":
      return PlayMethod.DirectStream;

    case "transcode":
      return PlayMethod.Transcode;
  }
}

export async function getPlaybackPlan(
  context: AuthenticatedJellyfinContext,
  itemId: string,
  resumePositionTicks: number,
): Promise<PlaybackPlan> {
  const api =
    createAuthenticatedJellyfinApi(
      context.accessToken,
      context.deviceId,
    );

  const response =
    await getMediaInfoApi(
      api,
    ).getPlaybackInfo({
      itemId,
      userId:
        context.user.id,
    });

  const sources =
    (
      response.data.MediaSources ??
      []
    ).map(normalizeSource);

  const preferred =
    preferredSource(sources);

  return {
    itemId,
    playSessionId:
      normalizedString(
        response.data.PlaySessionId,
      ),
    errorCode:
      response.data.ErrorCode
        ? String(
            response.data.ErrorCode,
          )
        : null,
    resumePositionTicks:
      Math.max(
        0,
        resumePositionTicks,
      ),
    preferredSourceId:
      preferred?.id ?? null,
    serverPreferredMethod:
      preferred
        ?.serverPreferredMethod ??
      "unsupported",
    sources,
    transport: {
      ready: false,
      strategy:
        "secure-direct-jellyfin",
      mediaBytesViaVercel:
        false,
      browserCompatibilityNegotiated:
        false,
      reason:
        "Browser capability negotiation and secure direct media transport are not connected yet.",
    },
  };
}

export async function reportPlaybackState(
  context: AuthenticatedJellyfinContext,
  update: PlaybackStateUpdate,
): Promise<void> {
  const api =
    createAuthenticatedJellyfinApi(
      context.accessToken,
      context.deviceId,
    );

  const playstateApi =
    getPlaystateApi(api);

  const playMethod =
    jellyfinPlayMethod(
      update.method,
    );

  if (update.action === "stop") {
    await playstateApi.reportPlaybackStopped({
      playbackStopInfo: {
        ItemId:
          update.itemId,
        MediaSourceId:
          update.mediaSourceId,
        PlaySessionId:
          update.playSessionId,
        PositionTicks:
          update.positionTicks,
        Failed:
          update.failed,
      },
    });

    return;
  }

  const playbackState = {
    ItemId:
      update.itemId,
    MediaSourceId:
      update.mediaSourceId,
    PlaySessionId:
      update.playSessionId,
    PositionTicks:
      update.positionTicks,
    CanSeek:
      update.canSeek,
    IsPaused:
      update.isPaused,
    IsMuted:
      update.isMuted,
    VolumeLevel:
      update.volumeLevel,
    AudioStreamIndex:
      update.audioStreamIndex,
    SubtitleStreamIndex:
      update.subtitleStreamIndex,
    PlayMethod:
      playMethod,
  };

  if (update.action === "start") {
    await playstateApi.reportPlaybackStart({
      playbackStartInfo:
        playbackState,
    });

    return;
  }

  await playstateApi.reportPlaybackProgress({
    playbackProgressInfo:
      playbackState,
  });
}