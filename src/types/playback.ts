export type PlaybackMethod =
  | "direct-play"
  | "direct-stream"
  | "transcode"
  | "unsupported";

export type PlaybackReportMethod =
  Exclude<
    PlaybackMethod,
    "unsupported"
  >;

export type PlaybackTrackKind =
  | "video"
  | "audio"
  | "subtitle"
  | "other";

export type PlaybackTrack = {
  index: number | null;
  kind: PlaybackTrackKind;
  codec: string | null;
  language: string | null;
  displayTitle: string | null;
  isDefault: boolean;
  isForced: boolean;
  isExternal: boolean;
  isTextSubtitle: boolean;
  channels: number | null;
  width: number | null;
  height: number | null;
};

export type PlaybackSource = {
  id: string | null;
  name: string | null;
  container: string | null;
  protocol: string | null;
  runtimeTicks: number | null;
  bitrate: number | null;
  defaultAudioStreamIndex:
    number | null;
  defaultSubtitleStreamIndex:
    number | null;
  supportsDirectPlay: boolean;
  supportsDirectStream: boolean;
  supportsTranscoding: boolean;
  serverPreferredMethod:
    PlaybackMethod;
  videoTracks: PlaybackTrack[];
  audioTracks: PlaybackTrack[];
  subtitleTracks: PlaybackTrack[];
};

export type PlaybackTransportPlan = {
  ready: false;
  strategy:
    "secure-direct-jellyfin";
  mediaBytesViaVercel: false;
  browserCompatibilityNegotiated:
    false;
  reason: string;
};

export type PlaybackPlan = {
  itemId: string;
  playSessionId: string | null;
  errorCode: string | null;
  resumePositionTicks: number;
  preferredSourceId:
    string | null;
  serverPreferredMethod:
    PlaybackMethod;
  sources: PlaybackSource[];
  transport: PlaybackTransportPlan;
};

export type PlaybackStateAction =
  | "start"
  | "progress"
  | "stop";

export type PlaybackStateUpdate = {
  action: PlaybackStateAction;
  itemId: string;
  playSessionId: string;
  mediaSourceId: string;
  positionTicks: number;
  method: PlaybackReportMethod;
  canSeek: boolean;
  isPaused: boolean;
  isMuted: boolean;
  volumeLevel: number;
  audioStreamIndex: number | null;
  subtitleStreamIndex: number | null;
  failed: boolean;
};