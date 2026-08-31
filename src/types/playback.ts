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

export type PlaybackSubtitleOption = {
  index: number;
  label: string;
  language: string | null;
  isDefault: boolean;
  isForced: boolean;
  streamUrl: string;
};

export type PlaybackTransportPending = {
  ready: false;
  strategy:
    "secure-direct-jellyfin";
  mediaBytesViaVercel: false;
  browserCompatibilityNegotiated:
    false;
  reason: string;
};

export type PlaybackTransportReady = {
  ready: true;
  strategy:
    "secure-direct-jellyfin";
  authorization:
    "encrypted-item-grant+caddy-forward-auth";
  mediaBytesViaVercel: false;
  compatibilityMode:
    "hls-h264-aac";
  streamUrl: string;
  requestGrant: string;
  expiresAt: string;
  segmentContainer: "mp4";
  videoCodec: "h264";
  audioCodec: "aac";
  reportMethod:
    PlaybackReportMethod;
  audioStreamIndex:
    number | null;
  runtimeTicks: number;
  initialPositionTicks: number;
  defaultSubtitleStreamIndex:
    number | null;
  subtitleTracks:
    PlaybackSubtitleOption[];
};

export type PlaybackTransportPlan =
  | PlaybackTransportPending
  | PlaybackTransportReady;

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