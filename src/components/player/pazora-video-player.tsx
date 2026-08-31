"use client";

import Hls from "hls.js";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  MediaItem,
} from "@/types/media";
import type {
  PlaybackPlan,
  PlaybackQualityMode,
  PlaybackStateAction,
} from "@/types/playback";

type PazoraVideoPlayerProps = {
  item: MediaItem;
  playback: PlaybackPlan;
};

type PlaybackPlanResponse = {
  authenticated?: boolean;
  playback?: PlaybackPlan;
  error?: string;
};

const jellyfinTicksPerSecond =
  10_000_000;

const controlsHideDelayMs =
  2800;

const touchControlsHideDelayMs =
  4200;

const touchClickWindowMs =
  800;

const playbackRateOptions = [
  0.5,
  0.75,
  1,
  1.25,
  1.5,
  2,
] as const;

type SubtitleSize =
  | "small"
  | "medium"
  | "large";

type SubtitleBackdrop =
  | "shadow"
  | "box"
  | "clear";

const subtitleSizeOptions: Array<{
  label: string;
  value: SubtitleSize;
}> = [
  {
    label: "Small",
    value: "small",
  },
  {
    label: "Standard",
    value: "medium",
  },
  {
    label: "Large",
    value: "large",
  },
];

const subtitleBackdropOptions: Array<{
  label: string;
  value: SubtitleBackdrop;
}> = [
  {
    label: "Shadow",
    value: "shadow",
  },
  {
    label: "Box",
    value: "box",
  },
  {
    label: "Clear",
    value: "clear",
  },
];

const subtitleDelayStepSeconds =
  0.25;

const subtitleDelayLimitSeconds =
  5;

function formatSubtitleDelay(
  seconds: number,
): string {
  if (
    Math.abs(seconds) <
    0.001
  ) {
    return "0.00s";
  }

  return (
    `${seconds > 0 ? "+" : ""}${seconds.toFixed(2)}s`
  );
}

function ticksFromSeconds(
  seconds: number,
): number {
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      seconds *
      jellyfinTicksPerSecond,
    ),
  );
}

function secondsFromTicks(
  ticks: number,
): number {
  return Math.max(
    0,
    ticks /
      jellyfinTicksPerSecond,
  );
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      value,
    ),
  );
}

function formatTime(
  seconds: number,
): string {
  const safe =
    Math.max(
      0,
      Math.floor(
        Number.isFinite(seconds)
          ? seconds
          : 0,
      ),
    );

  const hours =
    Math.floor(
      safe / 3600,
    );

  const minutes =
    Math.floor(
      (safe % 3600) / 60,
    );

  const remainingSeconds =
    safe % 60;

  if (hours > 0) {
    return [
      String(hours),
      String(minutes)
        .padStart(2, "0"),
      String(remainingSeconds)
        .padStart(2, "0"),
    ].join(":");
  }

  return [
    String(minutes),
    String(remainingSeconds)
      .padStart(2, "0"),
  ].join(":");
}



function PlayIcon({
  paused,
}: {
  paused: boolean;
}) {
  if (!paused) {
    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-7 w-7 fill-current"
      >
        <path d="M7 5h4v14H7V5Zm6 0h4v14h-4V5Z" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-7 w-7 fill-current"
    >
      <path d="M8 5v14l11-7L8 5Z" />
    </svg>
  );
}

function VolumeIcon({
  muted,
}: {
  muted: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 10v4h4l5 4V6L9 10H5Z" />
      {muted ? (
        <>
          <path d="m18 9 4 4" />
          <path d="m22 9-4 4" />
        </>
      ) : (
        <>
          <path d="M17 9.5a4 4 0 0 1 0 5" />
          <path d="M19.5 7a7 7 0 0 1 0 10" />
        </>
      )}
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth="1.8"
      strokeLinecap="round"
    >
      <path d="M8 4H4v4" />
      <path d="m4 4 5 5" />
      <path d="M16 4h4v4" />
      <path d="m20 4-5 5" />
      <path d="M8 20H4v-4" />
      <path d="m4 20 5-5" />
      <path d="M16 20h4v-4" />
      <path d="m20 20-5-5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6 fill-none stroke-current"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" />
      <path d="M19.1 13.4a7.6 7.6 0 0 0 .05-2.8l2-1.55-2-3.45-2.48 1a8.6 8.6 0 0 0-2.42-1.4L13.9 2.5h-4l-.35 2.7a8.6 8.6 0 0 0-2.42 1.4l-2.48-1-2 3.45 2 1.55a7.6 7.6 0 0 0 .05 2.8l-2.05 1.6 2 3.45 2.55-1.03a8.4 8.4 0 0 0 2.35 1.35l.35 2.73h4l.35-2.73a8.4 8.4 0 0 0 2.35-1.35l2.55 1.03 2-3.45-2.05-1.6Z" />
    </svg>
  );
}

function SkipIcon({
  direction,
}: {
  direction:
    | "back"
    | "forward";
}) {
  return (
    <span className="relative inline-flex h-7 w-8 items-center justify-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="absolute h-7 w-7 fill-none stroke-current"
        strokeWidth="1.7"
        strokeLinecap="round"
      >
        {direction === "back" ? (
          <path d="M7 7H3v-4M3.5 7A9 9 0 1 1 4 17" />
        ) : (
          <path d="M17 7h4v-4m-.5 4A9 9 0 1 0 20 17" />
        )}
      </svg>

      <span className="relative mt-0.5 text-[8px] font-bold">
        10
      </span>
    </span>
  );
}

export function PazoraVideoPlayer({
  item,
  playback,
}: PazoraVideoPlayerProps) {
  const videoRef =
    useRef<HTMLVideoElement | null>(
      null,
    );

  const containerRef =
    useRef<HTMLElement | null>(
      null,
    );

  const controlsTimerRef =
    useRef<
      ReturnType<typeof setTimeout> |
      null
    >(null);

  const lastTouchAtRef =
    useRef(0);

  const touchInteractionRef =
    useRef(false);

  const startedRef =
    useRef(false);

  const stoppedRef =
    useRef(false);


  const subtitleMenuOpenRef =
    useRef(false);

  const settingsMenuOpenRef =
    useRef(false);

  const subtitleButtonRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const settingsButtonRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const hlsRef =
    useRef<Hls | null>(
      null,
    );

  const transportSwitchingRef =
    useRef(false);

  const resumeAfterTransportSwitchRef =
    useRef(false);

  const playbackRateRef =
    useRef(1);

  const subtitleCueBaselinesRef =
    useRef(
      new WeakMap<
        TextTrackCue,
        {
          startTime: number;
          endTime: number;
        }
      >(),
    );

  const subtitleCueItemIdRef =
    useRef(
      item.id,
    );

  const initialAutoplayItemIdRef =
    useRef<string | null>(
      null,
    );

  const [
    activePlayback,
    setActivePlayback,
  ] =
    useState(
      playback,
    );

  const transport =
    activePlayback.transport.ready
      ? activePlayback.transport
      : null;

  const initialTicks =
    transport
      ?.initialPositionTicks ??
    0;

  const runtimeSeconds =
    secondsFromTicks(
      transport
        ?.runtimeTicks ??
      0,
    );

  const initialSeconds =
    secondsFromTicks(
      initialTicks,
    );

  const source =
    activePlayback.sources.find(
      (candidate) =>
        candidate.id ===
        activePlayback
          .preferredSourceId,
    ) ??
    activePlayback.sources[0] ??
    null;

  const mediaSourceId =
    source?.id ??
    activePlayback
      .preferredSourceId;

  const playSessionId =
    activePlayback
      .playSessionId;

  const audioStreamIndex =
    transport
      ?.audioStreamIndex ??
    null;

  const defaultSubtitleIndex =
    transport
      ?.subtitleStreamIndex ??
    null;

  const selectedSubtitleIndexRef =
    useRef<number | null>(
      defaultSubtitleIndex,
    );

  const streamUrl =
    transport?.streamUrl ??
    "";

  const lastProgressSecondsRef =
    useRef(
      initialSeconds,
    );

  const [
    currentSeconds,
    setCurrentSeconds,
  ] =
    useState(
      initialSeconds,
    );

  const [
    seekPreviewSeconds,
    setSeekPreviewSeconds,
  ] =
    useState<number | null>(
      null,
    );

  const [
    isPlaying,
    setIsPlaying,
  ] =
    useState(false);

  const [
    isBuffering,
    setIsBuffering,
  ] =
    useState(false);

  const [
    playerError,
    setPlayerError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    isChangingTransport,
    setIsChangingTransport,
  ] =
    useState(false);

  const [
    streamChangeError,
    setStreamChangeError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    controlsVisible,
    setControlsVisible,
  ] =
    useState(true);

  const [
    muted,
    setMuted,
  ] =
    useState(false);

  const [
    volume,
    setVolume,
  ] =
    useState(1);

  const [
    subtitleMenuOpen,
    setSubtitleMenuOpen,
  ] =
    useState(false);

  const [
    settingsMenuOpen,
    setSettingsMenuOpen,
  ] =
    useState(false);

  const [
    playbackRate,
    setPlaybackRate,
  ] =
    useState(1);

  const [
    subtitleSize,
    setSubtitleSize,
  ] =
    useState<SubtitleSize>(
      "medium",
    );

  const [
    subtitleBackdrop,
    setSubtitleBackdrop,
  ] =
    useState<SubtitleBackdrop>(
      "shadow",
    );

  const [
    subtitleDelayState,
    setSubtitleDelayState,
  ] =
    useState({
      itemId: item.id,
      seconds: 0,
    });

  const subtitleDelaySeconds =
    subtitleDelayState.itemId ===
    item.id
      ? subtitleDelayState.seconds
      : 0;

  const setSubtitleDelaySeconds =
    useCallback(
      (
        next:
          number |
          ((current: number) => number),
      ) => {
        setSubtitleDelayState(
          (current) => {
            const currentSeconds =
              current.itemId ===
              item.id
                ? current.seconds
                : 0;

            const nextSeconds =
              typeof next ===
              "function"
                ? next(
                    currentSeconds,
                  )
                : next;

            return {
              itemId:
                item.id,
              seconds:
                nextSeconds,
            };
          },
        );
      },
      [
        item.id,
      ],
    );

  const [
    selectedSubtitleIndex,
    setSelectedSubtitleIndex,
  ] =
    useState<number | null>(
      defaultSubtitleIndex,
    );

  const [
    fullscreen,
    setFullscreen,
  ] =
    useState(false);


  const clearControlsTimer =
    useCallback(
      () => {
        if (
          controlsTimerRef.current
        ) {
          clearTimeout(
            controlsTimerRef.current,
          );

          controlsTimerRef.current =
            null;
        }
      },
      [],
    );

  const revealControls =
    useCallback(
      () => {
        setControlsVisible(
          true,
        );

        clearControlsTimer();

        const hideDelayMs =
          touchInteractionRef.current
            ? touchControlsHideDelayMs
            : controlsHideDelayMs;

        controlsTimerRef.current =
          setTimeout(
            () => {
              const video =
                videoRef.current;

              const container =
                containerRef.current;

              const activeElement =
                document.activeElement;

              const keyboardFocusInsidePlayer =
                activeElement instanceof
                  HTMLElement &&
                container?.contains(
                  activeElement,
                ) === true &&
                activeElement !== video;

              if (
                video &&
                !video.paused &&
                !subtitleMenuOpenRef
                  .current &&
                !settingsMenuOpenRef
                  .current &&
                !keyboardFocusInsidePlayer
              ) {
                setControlsVisible(
                  false,
                );
              }
            },
            hideDelayMs,
          );
      },
      [
        clearControlsTimer,
      ],
    );

  const handleMouseActivity =
    useCallback(
      () => {
        if (
          Date.now() -
            lastTouchAtRef.current <
          touchClickWindowMs
        ) {
          return;
        }

        touchInteractionRef.current =
          false;

        revealControls();
      },
      [
        revealControls,
      ],
    );

  const handleTouchStart =
    useCallback(
      () => {
        touchInteractionRef.current =
          true;

        lastTouchAtRef.current =
          Date.now();
      },
      [],
    );

  const absolutePositionSeconds =
    useCallback(
      () => {
        const video =
          videoRef.current;

        if (!video) {
          return initialSeconds;
        }

        return clamp(
          video.currentTime,
          0,
          runtimeSeconds,
        );
      },
      [
        initialSeconds,
        runtimeSeconds,
      ],
    );

  const reportPlayback =
    useCallback(
      (
        action:
          PlaybackStateAction,
        failed = false,
      ) => {
        const video =
          videoRef.current;

        if (
          !video ||
          !transport ||
          !mediaSourceId ||
          !playSessionId
        ) {
          return;
        }

        const absoluteSeconds =
          absolutePositionSeconds();

        const payload = {
          action,
          itemId:
            item.id,
          playSessionId,
          mediaSourceId,
          positionTicks:
            ticksFromSeconds(
              absoluteSeconds,
            ),
          method:
            transport.reportMethod,
          canSeek:
            true,
          isPaused:
            video.paused,
          isMuted:
            video.muted,
          volumeLevel:
            Math.round(
              video.volume *
              100,
            ),
          audioStreamIndex,
          subtitleStreamIndex:
            selectedSubtitleIndexRef
              .current,
          failed,
        };

        void fetch(
          "/api/playback/state",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                payload,
              ),
            keepalive:
              action === "stop",
          },
        ).catch(() => {
          // Playback telemetry must never stop media playback.
        });
      },
      [
        absolutePositionSeconds,
        audioStreamIndex,
        item.id,
        mediaSourceId,
        playSessionId,
        transport,
      ],
    );

  const seekToAbsolute =
    useCallback(
      (
        requestedSeconds: number,
      ) => {
        const video =
          videoRef.current;

        if (
          !video ||
          !transport ||
          runtimeSeconds <= 0
        ) {
          return;
        }

        const targetSeconds =
          clamp(
            requestedSeconds,
            0,
            Math.max(
              0,
              runtimeSeconds - 0.25,
            ),
          );

        if (
          startedRef.current
        ) {
          reportPlayback(
            "progress",
          );
        }

        lastProgressSecondsRef
          .current =
          targetSeconds;

        setCurrentSeconds(
          targetSeconds,
        );

        setSeekPreviewSeconds(
          null,
        );

        // HLS.js owns the full VOD timeline. Seeking changes the
        // media position; it does not create a new Jellyfin stream
        // carrying StartTimeTicks into generated segment requests.
        video.currentTime =
          targetSeconds;

        setIsBuffering(
          true,
        );

        revealControls();
      },
      [
        reportPlayback,
        revealControls,
        runtimeSeconds,
        transport,
      ],
    );

  const togglePlay =
    useCallback(
      () => {
        const video =
          videoRef.current;

        if (!video) {
          return;
        }

        revealControls();

        if (video.paused) {
          void video
            .play()
            .catch(() => {
              setIsPlaying(
                false,
              );

              setControlsVisible(
                true,
              );
            });
        } else {
          video.pause();
        }
      },
      [
        revealControls,
      ],
    );

  const skipBy =
    useCallback(
      (
        seconds: number,
      ) => {
        seekToAbsolute(
          absolutePositionSeconds() +
          seconds,
        );
      },
      [
        absolutePositionSeconds,
        seekToAbsolute,
      ],
    );

  const toggleMute =
    useCallback(
      () => {
        const video =
          videoRef.current;

        if (!video) {
          return;
        }

        video.muted =
          !video.muted;

        setMuted(
          video.muted,
        );

        revealControls();
      },
      [
        revealControls,
      ],
    );

  const toggleFullscreen =
    useCallback(
      () => {
        const container =
          containerRef.current;

        if (!container) {
          return;
        }

        revealControls();

        if (
          document.fullscreenElement
        ) {
          void document
            .exitFullscreen()
            .catch(() => {
              revealControls();
            });

          return;
        }

        void container
          .requestFullscreen()
          .catch(() => {
            setFullscreen(
              false,
            );

            revealControls();
          });
      },
      [
        revealControls,
      ],
    );

  const closePlayerMenus =
    useCallback(
      (
        restoreFocus: boolean,
      ): boolean => {
        const settingsWasOpen =
          settingsMenuOpenRef
            .current;

        const subtitlesWereOpen =
          subtitleMenuOpenRef
            .current;

        if (
          !settingsWasOpen &&
          !subtitlesWereOpen
        ) {
          return false;
        }

        settingsMenuOpenRef
          .current =
          false;

        subtitleMenuOpenRef
          .current =
          false;

        setSettingsMenuOpen(
          false,
        );

        setSubtitleMenuOpen(
          false,
        );

        revealControls();

        if (restoreFocus) {
          const target =
            settingsWasOpen
              ? settingsButtonRef
                  .current
              : subtitleButtonRef
                  .current;

          queueMicrotask(
            () => {
              target?.focus();
            },
          );
        }

        return true;
      },
      [
        revealControls,
      ],
    );

  const handleVideoClick =
    useCallback(
      () => {
        if (
          closePlayerMenus(
            false,
          )
        ) {
          return;
        }

        const recentlyTouched =
          Date.now() -
            lastTouchAtRef.current <
          touchClickWindowMs;

        if (!recentlyTouched) {
          togglePlay();

          return;
        }

        if (
          controlsVisible &&
          isPlaying
        ) {
          clearControlsTimer();

          setControlsVisible(
            false,
          );

          return;
        }

        revealControls();
      },
      [
        clearControlsTimer,
        closePlayerMenus,
        controlsVisible,
        isPlaying,
        revealControls,
        togglePlay,
      ],
    );

  const handleVideoDoubleClick =
    useCallback(
      () => {
        if (
          Date.now() -
            lastTouchAtRef.current <
          touchClickWindowMs
        ) {
          return;
        }

        toggleFullscreen();
      },
      [
        toggleFullscreen,
      ],
    );


  const toggleSubtitleMenu =
    useCallback(
      () => {
        const next =
          !subtitleMenuOpenRef
            .current;

        settingsMenuOpenRef
          .current =
          false;

        setSettingsMenuOpen(
          false,
        );

        subtitleMenuOpenRef
          .current =
          next;

        setSubtitleMenuOpen(
          next,
        );

        revealControls();
      },
      [
        revealControls,
      ],
    );

  const toggleSettingsMenu =
    useCallback(
      () => {
        const next =
          !settingsMenuOpenRef
            .current;

        subtitleMenuOpenRef
          .current =
          false;

        setSubtitleMenuOpen(
          false,
        );

        settingsMenuOpenRef
          .current =
          next;

        setSettingsMenuOpen(
          next,
        );

        revealControls();
      },
      [
        revealControls,
      ],
    );

  const changePlaybackRate =
    useCallback(
      (
        nextRate: number,
      ) => {
        const video =
          videoRef.current;

        if (video) {
          video.playbackRate =
            nextRate;
        }

        playbackRateRef.current =
          nextRate;

        setPlaybackRate(
          nextRate,
        );

        revealControls();
      },
      [
        revealControls,
      ],
    );

  const applySubtitleDelay =
    useCallback(
      () => {
        const video =
          videoRef.current;

        if (!video) {
          return;
        }

        if (
          subtitleCueItemIdRef
            .current !==
          item.id
        ) {
          subtitleCueItemIdRef
            .current =
            item.id;

          subtitleCueBaselinesRef
            .current =
            new WeakMap();
        }

        for (
          let trackIndex = 0;
          trackIndex <
          video.textTracks.length;
          trackIndex += 1
        ) {
          const textTrack =
            video.textTracks[
              trackIndex
            ];

          const cues =
            textTrack.cues;

          if (!cues) {
            continue;
          }

          for (
            let cueIndex = 0;
            cueIndex <
            cues.length;
            cueIndex += 1
          ) {
            const cue =
              cues[cueIndex];

            let baseline =
              subtitleCueBaselinesRef
                .current
                .get(cue);

            if (!baseline) {
              baseline = {
                startTime:
                  cue.startTime,
                endTime:
                  cue.endTime,
              };

              subtitleCueBaselinesRef
                .current
                .set(
                  cue,
                  baseline,
                );
            }

            const startTime =
              Math.max(
                0,
                baseline.startTime +
                subtitleDelaySeconds,
              );

            const endTime =
              Math.max(
                startTime + 0.05,
                baseline.endTime +
                subtitleDelaySeconds,
              );

            cue.startTime =
              startTime;

            cue.endTime =
              endTime;
          }
        }
      },
      [
        item.id,
        subtitleDelaySeconds,
      ],
    );

  const switchTransport =
    useCallback(
      async (
        nextAudioStreamIndex:
          number | null,
        nextQualityMode:
          PlaybackQualityMode,
        nextSubtitleStreamIndex:
          number | null,
      ) => {
        const video =
          videoRef.current;

        if (
          !video ||
          !transport ||
          transportSwitchingRef
            .current
        ) {
          return;
        }

        if (
          nextAudioStreamIndex ===
            transport
              .audioStreamIndex &&
          nextQualityMode ===
            transport
              .qualityMode &&
          nextSubtitleStreamIndex ===
            transport
              .subtitleStreamIndex
        ) {
          return;
        }

        transportSwitchingRef.current =
          true;

        setIsChangingTransport(
          true,
        );

        setStreamChangeError(
          null,
        );

        revealControls();

        const positionSeconds =
          absolutePositionSeconds();

        const positionTicks =
          ticksFromSeconds(
            positionSeconds,
          );

        const shouldResume =
          !video.paused;

        if (
          startedRef.current
        ) {
          reportPlayback(
            "progress",
          );
        }

        const query =
          new URLSearchParams({
            quality:
              nextQualityMode,
            positionTicks:
              String(
                positionTicks,
              ),
          });

        if (
          nextAudioStreamIndex !==
          null
        ) {
          query.set(
            "audioStreamIndex",
            String(
              nextAudioStreamIndex,
            ),
          );
        }

        query.set(
          "subtitleStreamIndex",
          nextSubtitleStreamIndex ===
            null
            ? "-1"
            : String(
                nextSubtitleStreamIndex,
              ),
        );

        try {
          const response =
            await fetch(
              `/api/playback/items/${encodeURIComponent(item.id)}?${query.toString()}`,
              {
                method: "GET",
                headers: {
                  Accept:
                    "application/json",
                },
                cache:
                  "no-store",
              },
            );

          let body:
            PlaybackPlanResponse;

          try {
            body =
              await response
                .json() as
                PlaybackPlanResponse;
          } catch {
            throw new Error(
              "The playback server returned an invalid response.",
            );
          }

          if (
            !response.ok ||
            !body.playback
          ) {
            throw new Error(
              body.error ??
              "Unable to prepare the selected stream.",
            );
          }

          const nextPlayback =
            body.playback;

          if (
            !nextPlayback
              .transport.ready
          ) {
            throw new Error(
              body.error ??
              nextPlayback
                .transport.reason ??
              "Unable to prepare the selected stream.",
            );
          }

          const nextTransport =
            nextPlayback
              .transport;

          if (
            startedRef.current &&
            !stoppedRef.current
          ) {
            stoppedRef.current =
              true;

            reportPlayback(
              "stop",
            );
          }

          resumeAfterTransportSwitchRef
            .current =
            shouldResume;

          startedRef.current =
            false;

          stoppedRef.current =
            false;

          const nextPositionSeconds =
            secondsFromTicks(
              nextTransport
                .initialPositionTicks,
            );

          lastProgressSecondsRef
            .current =
            nextPositionSeconds;

          setCurrentSeconds(
            nextPositionSeconds,
          );

          setSeekPreviewSeconds(
            null,
          );

          selectedSubtitleIndexRef
            .current =
            nextTransport
              .subtitleStreamIndex;

          setSelectedSubtitleIndex(
            nextTransport
              .subtitleStreamIndex,
          );

          setIsBuffering(
            true,
          );

          setActivePlayback(
            nextPlayback,
          );
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Unable to change the playback stream.";

          setStreamChangeError(
            message,
          );
        } finally {
          transportSwitchingRef
            .current =
            false;

          setIsChangingTransport(
            false,
          );
        }
      },
      [
        absolutePositionSeconds,
        item.id,
        reportPlayback,
        revealControls,
        transport,
      ],
    );
  const selectSubtitle =
    useCallback(
      (
        index: number | null,
      ) => {
        if (!transport) {
          return;
        }

        const currentTrack =
          selectedSubtitleIndexRef
            .current === null
            ? null
            : transport.subtitleTracks.find(
                (track) =>
                  track.index ===
                  selectedSubtitleIndexRef
                    .current,
              ) ??
              null;

        const nextTrack =
          index === null
            ? null
            : transport.subtitleTracks.find(
                (track) =>
                  track.index === index,
              ) ??
              null;

        setSubtitleMenuOpen(
          false,
        );

        subtitleMenuOpenRef
          .current =
          false;

        revealControls();

        queueMicrotask(
          () => {
            subtitleButtonRef
              .current
              ?.focus();
          },
        );

        const requiresTransportSwitch =
          currentTrack?.delivery ===
            "burn-in" ||
          nextTrack?.delivery ===
            "burn-in";

        if (requiresTransportSwitch) {
          void switchTransport(
            transport.audioStreamIndex,
            transport.qualityMode,
            index,
          );

          return;
        }

        setSelectedSubtitleIndex(
          index,
        );

        selectedSubtitleIndexRef
          .current =
          index;

        if (
          startedRef.current
        ) {
          reportPlayback(
            "progress",
          );
        }
      },
      [
        reportPlayback,
        revealControls,
        switchTransport,
        transport,
      ],
    );
  const retryPlayback =
    useCallback(
      () => {
        const video =
          videoRef.current;

        const hls =
          hlsRef.current;

        if (
          !video ||
          !hls
        ) {
          return;
        }

        setPlayerError(
          null,
        );

        setIsBuffering(
          true,
        );

        revealControls();

        hls.startLoad(
          Number.isFinite(
            video.currentTime,
          )
            ? video.currentTime
            : -1,
        );

        void video
          .play()
          .catch(() => {
            setIsBuffering(
              false,
            );

            setPlayerError(
              "Playback could not be resumed. Try again.",
            );
          });
      },
      [
        revealControls,
      ],
    );

  const toggleCaptionsQuick =
    useCallback(
      () => {
        if (!transport) {
          return;
        }

        if (
          selectedSubtitleIndexRef
            .current !== null
        ) {
          selectSubtitle(
            null,
          );

          return;
        }

        const fallback =
          transport
            .defaultSubtitleStreamIndex ??
          transport
            .subtitleTracks[0]
            ?.index ??
          null;

        selectSubtitle(
          fallback,
        );
      },
      [
        selectSubtitle,
        transport,
      ],
    );

  useEffect(
    () => {
      applySubtitleDelay();
    },
    [
      applySubtitleDelay,
      selectedSubtitleIndex,
    ],
  );

  useEffect(
    () => {
      const video =
        videoRef.current;

      if (
        !video ||
        !transport
      ) {
        return;
      }

      if (!Hls.isSupported()) {
        return;
      }

      const hls =
        new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          startPosition:
            initialSeconds,
          xhrSetup: (
            xhr,
          ) => {
            xhr.setRequestHeader(
              "X-Pazora-Grant",
              transport.requestGrant,
            );
          },
        });

      hlsRef.current =
        hls;

      const handleMediaAttached =
        () => {
          hls.loadSource(
            streamUrl,
          );
        };

      const handleManifestParsed =
        () => {
          video.playbackRate =
            playbackRateRef
              .current;

          const shouldAutoPlayInitial =
            initialAutoplayItemIdRef
              .current !==
            item.id;

          if (shouldAutoPlayInitial) {
            initialAutoplayItemIdRef
              .current =
              item.id;
          }

          const shouldResumeAfterSwitch =
            resumeAfterTransportSwitchRef
              .current;

          resumeAfterTransportSwitchRef
            .current =
            false;

          const shouldAutoPlay =
            shouldAutoPlayInitial ||
            shouldResumeAfterSwitch;

          if (!shouldAutoPlay) {
            return;
          }

          void video
            .play()
            .catch(() => {
              // A browser may reject an autoplay request.
              // Never mute the movie to bypass that policy:
              // remain paused and expose the normal Play control.
              setControlsVisible(
                true,
              );

              setIsPlaying(
                false,
              );

              setIsBuffering(
                false,
              );
            });
        };

      const handleHlsError =
        (
          _event: string,
          data: {
            fatal: boolean;
            type: string;
          },
        ) => {
          if (!data.fatal) {
            return;
          }

          setIsBuffering(
            false,
          );

          if (
            data.type ===
            Hls.ErrorTypes.NETWORK_ERROR
          ) {
            setPlayerError(
              "The video connection was interrupted.",
            );

            hls.startLoad();

            return;
          }

          if (
            data.type ===
            Hls.ErrorTypes.MEDIA_ERROR
          ) {
            setPlayerError(
              "The browser encountered a media playback error.",
            );

            hls.recoverMediaError();

            return;
          }

          setPlayerError(
            "Playback stopped because of an unrecoverable stream error.",
          );
        };

      hls.on(
        Hls.Events.MEDIA_ATTACHED,
        handleMediaAttached,
      );

      hls.on(
        Hls.Events.MANIFEST_PARSED,
        handleManifestParsed,
      );

      hls.on(
        Hls.Events.ERROR,
        handleHlsError,
      );

      hls.attachMedia(
        video,
      );

      return () => {
        hls.off(
          Hls.Events.MEDIA_ATTACHED,
          handleMediaAttached,
        );

        hls.off(
          Hls.Events.MANIFEST_PARSED,
          handleManifestParsed,
        );

        hls.off(
          Hls.Events.ERROR,
          handleHlsError,
        );

        if (
          hlsRef.current ===
          hls
        ) {
          hlsRef.current =
            null;
        }

        hls.destroy();
      };
    },
    [
      initialSeconds,
      item.id,
      streamUrl,
      transport,
    ],
  );

  useEffect(
    () => {
      return () => {
        clearControlsTimer();

        if (
          startedRef.current &&
          !stoppedRef.current
        ) {
          stoppedRef.current =
            true;

          reportPlayback(
            "stop",
          );
        }
      };
    },
    [
      clearControlsTimer,
      reportPlayback,
    ],
  );

  useEffect(
    () => {
      const handleKeyDown =
        (
          event: KeyboardEvent,
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            if (
              closePlayerMenus(
                true,
              )
            ) {
              event.preventDefault();
              event.stopPropagation();
            }

            return;
          }

          if (
            event.defaultPrevented ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
          ) {
            return;
          }

          const targetElement =
            event.target instanceof
              Element
              ? event.target
              : null;

          const interactiveTarget =
            targetElement?.closest(
              "button,a,input,textarea,select,[contenteditable='true']",
            );

          if (interactiveTarget) {
            return;
          }

          switch (
            event.key.toLowerCase()
          ) {
            case " ":
            case "k":
              event.preventDefault();
              togglePlay();
              break;

            case "arrowleft":
            case "j":
              event.preventDefault();
              skipBy(-10);
              break;

            case "arrowright":
            case "l":
              event.preventDefault();
              skipBy(10);
              break;

            case "m":
              event.preventDefault();
              toggleMute();
              break;

            case "f":
              event.preventDefault();
              toggleFullscreen();
              break;

            case "c":
              event.preventDefault();
              toggleCaptionsQuick();
              break;

            default:
              break;
          }
        };

      const handleFullscreenChange =
        () => {
          setFullscreen(
            document
              .fullscreenElement ===
              containerRef.current,
          );

          revealControls();
        };

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      document.addEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );

        document.removeEventListener(
          "fullscreenchange",
          handleFullscreenChange,
        );
      };
    },
    [
      closePlayerMenus,
      revealControls,
      skipBy,
      toggleCaptionsQuick,
      toggleFullscreen,
      toggleMute,
      togglePlay,
    ],
  );

  if (!transport) {
    return null;
  }

  const displaySeconds =
    seekPreviewSeconds ??
    currentSeconds;

  const progressPercent =
    runtimeSeconds > 0
      ? clamp(
          (
            displaySeconds /
            runtimeSeconds
          ) *
            100,
          0,
          100,
        )
      : 0;

  const selectedSubtitle =
    transport.subtitleTracks.find(
      (track) =>
        track.index ===
        selectedSubtitleIndex,
    ) ??
    null;

  const activeSubtitleUrl =
    selectedSubtitle
      ?.streamUrl ??
    null;

  const overlayVisible =
    controlsVisible ||
    !isPlaying ||
    subtitleMenuOpen ||
    settingsMenuOpen ||
    playerError !== null;

  const subtitleFontSize =
    subtitleSize === "small"
      ? "clamp(14px, 2.1vmin, 22px)"
      : subtitleSize === "large"
        ? "clamp(18px, 3.2vmin, 34px)"
        : "clamp(16px, 2.6vmin, 28px)";

  const subtitleCueBackground =
    subtitleBackdrop === "box"
      ? "rgba(0, 0, 0, 0.78)"
      : "transparent";

  const subtitleCueShadow =
    subtitleBackdrop === "shadow"
      ? "0 2px 3px rgba(0,0,0,0.98), 0 0 9px rgba(0,0,0,0.9)"
      : subtitleBackdrop === "box"
        ? "0 1px 2px rgba(0,0,0,0.9)"
        : "none";

  return (
    <section
      ref={containerRef}
      onMouseMove={
        handleMouseActivity
      }
      onMouseDown={
        handleMouseActivity
      }
      onTouchStart={
        handleTouchStart
      }
      onFocusCapture={
        revealControls
      }
      className="pazora-player group relative flex h-[100dvh] w-screen touch-manipulation select-none items-center justify-center overflow-hidden bg-black text-white"
    >
      <style>
        {`
          .pazora-video::cue {
            color: #ffffff;
            background: ${subtitleCueBackground};
            font-size: ${subtitleFontSize};
            font-family: Inter, ui-sans-serif, system-ui, sans-serif;
            font-weight: 600;
            line-height: 1.25;
            text-shadow: ${subtitleCueShadow};
          }

          .pazora-player button:focus-visible,
          .pazora-player a:focus-visible,
          .pazora-player input:focus-visible {
            outline: 2px solid #ffffff;
            outline-offset: 2px;
          }
        `}
      </style>

      <video
        ref={videoRef}
        crossOrigin="anonymous"
        playsInline
        preload="metadata"
        className="pazora-video h-full w-full bg-black object-contain"
        aria-label={`Play ${item.name}`}
        onClick={
          handleVideoClick
        }
        onDoubleClick={
          handleVideoDoubleClick
        }
        onPlaying={() => {
          setIsPlaying(
            true,
          );

          setIsBuffering(
            false,
          );

          setPlayerError(
            null,
          );

          stoppedRef.current =
            false;

          revealControls();

          if (
            !startedRef.current
          ) {
            startedRef.current =
              true;

            reportPlayback(
              "start",
            );
          } else {
            reportPlayback(
              "progress",
            );
          }
        }}
        onPause={() => {
          setIsPlaying(
            false,
          );

          setControlsVisible(
            true,
          );

          clearControlsTimer();

          if (
            startedRef.current
          ) {
            reportPlayback(
              "progress",
            );
          }
        }}
        onWaiting={() => {
          setIsBuffering(
            true,
          );

          revealControls();
        }}
        onCanPlay={() => {
          setIsBuffering(
            false,
          );
        }}
        onTimeUpdate={() => {
          const absolute =
            absolutePositionSeconds();

          setCurrentSeconds(
            absolute,
          );

          if (
            startedRef.current &&
            absolute -
              lastProgressSecondsRef
                .current >=
              10
          ) {
            lastProgressSecondsRef
              .current =
              absolute;

            reportPlayback(
              "progress",
            );
          }
        }}
        onSeeked={() => {
          if (
            startedRef.current
          ) {
            reportPlayback(
              "progress",
            );
          }
        }}
        onEnded={() => {
          setIsPlaying(
            false,
          );

          setControlsVisible(
            true,
          );

          setCurrentSeconds(
            runtimeSeconds,
          );

          if (
            startedRef.current &&
            !stoppedRef.current
          ) {
            stoppedRef.current =
              true;

            reportPlayback(
              "stop",
            );
          }
        }}
        onError={() => {
          setPlayerError(
            "The browser could not continue playing this stream.",
          );

          setIsBuffering(
            false,
          );

          setIsPlaying(
            false,
          );

          setControlsVisible(
            true,
          );

          if (
            startedRef.current &&
            !stoppedRef.current
          ) {
            stoppedRef.current =
              true;

            reportPlayback(
              "stop",
              true,
            );
          }
        }}
      >
        {activeSubtitleUrl ? (
          <track
            key={
              String(
                selectedSubtitleIndex,
              )
            }
            kind="subtitles"
            src={activeSubtitleUrl}
            srcLang={
              selectedSubtitle
                ?.language ??
              "und"
            }
            label={
              selectedSubtitle
                ?.label ??
              "Subtitles"
            }
            default
            onLoad={() => {
              const video =
                videoRef.current;

              if (!video) {
                return;
              }

              subtitleCueBaselinesRef
                .current =
                new WeakMap();

              for (
                let index = 0;
                index <
                  video.textTracks
                    .length;
                index += 1
              ) {
                video.textTracks[
                  index
                ].mode =
                  "showing";
              }

              applySubtitleDelay();
            }}
          />
        ) : null}
      </video>

      {isBuffering &&
      !playerError ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
        </div>
      ) : null}

      {playerError ? (
        <div className="absolute inset-0 z-[45] flex items-center justify-center bg-black/55 px-6 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#141414]/95 p-6 text-center shadow-2xl">
            <p className="text-lg font-semibold tracking-[-0.02em]">
              Playback interrupted
            </p>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-white/60">
              {playerError}
            </p>

            <button
              type="button"
              onClick={
                retryPlayback
              }
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-black transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Retry playback
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={[
          "pointer-events-none absolute inset-x-0 top-0 z-30 h-40 bg-gradient-to-b from-black/85 via-black/35 to-transparent transition-opacity duration-300",
          overlayVisible
            ? "opacity-100"
            : "opacity-0",
        ].join(" ")}
      />

      <div
        className={[
          "pointer-events-none absolute inset-x-0 bottom-0 z-30 h-64 bg-gradient-to-t from-black/95 via-black/50 to-transparent transition-opacity duration-300",
          overlayVisible
            ? "opacity-100"
            : "opacity-0",
        ].join(" ")}
      />

      <div
        className={[
          "absolute inset-x-0 top-0 z-40 flex items-center px-3 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))] transition-all duration-300 sm:px-8 sm:pb-5",
          overlayVisible
            ? "translate-y-0 opacity-100"
            : "-translate-y-3 pointer-events-none opacity-0",
        ].join(" ")}
      >
        <Link
          href={`/title/${item.id}`}
          prefetch={false}
          onClick={() => {
            if (
              startedRef.current &&
              !stoppedRef.current
            ) {
              stoppedRef.current =
                true;

              reportPlayback(
                "stop",
              );
            }
          }}
          aria-label="Back to title details"
          className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-full bg-black/35 text-2xl backdrop-blur-md transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span aria-hidden="true">
            {"\u2190"}
          </span>
        </Link>

        <div className="ml-4 min-w-0">
          <h1 className="truncate text-base font-semibold tracking-[-0.01em] sm:text-lg">
            {item.name}
          </h1>

          {item.seriesName ? (
            <p className="mt-0.5 truncate text-xs text-white/55">
              {[
                item.seriesName,
                item.seasonName,
                item.indexNumber !==
                null
                  ? `Episode ${item.indexNumber}`
                  : null,
              ]
                .filter(Boolean)
                .join(" \u2022 ")}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={[
          "absolute inset-x-0 bottom-0 z-50 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-all duration-300 sm:px-8 sm:pb-[max(1.75rem,env(safe-area-inset-bottom))]",
          overlayVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-4 pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div className="mb-3 grid grid-cols-2 items-center gap-x-3 gap-y-1 sm:mb-4 sm:flex sm:gap-3">
          <span className="order-2 w-auto shrink-0 text-left text-[11px] font-medium tabular-nums text-white/90 sm:order-none sm:w-16 sm:text-right sm:text-sm">
            {formatTime(
              displaySeconds,
            )}
          </span>

          <input
            aria-label="Playback position"
            type="range"
            min={0}
            max={
              Math.max(
                runtimeSeconds,
                0,
              )
            }
            step={1}
            value={
              Math.min(
                displaySeconds,
                runtimeSeconds,
              )
            }
            onChange={
              (event) => {
                setSeekPreviewSeconds(
                  Number(
                    event
                      .currentTarget
                      .value,
                  ),
                );
              }
            }
            onPointerUp={() => {
              if (
                seekPreviewSeconds !==
                null
              ) {
                seekToAbsolute(
                  seekPreviewSeconds,
                );
              }
            }}
            onKeyUp={() => {
              if (
                seekPreviewSeconds !==
                null
              ) {
                seekToAbsolute(
                  seekPreviewSeconds,
                );
              }
            }}
            className="order-1 col-span-2 h-8 min-w-0 flex-1 touch-pan-x cursor-pointer appearance-none bg-transparent sm:order-none sm:col-auto sm:h-5
              [&::-webkit-slider-runnable-track]:h-1
              [&::-webkit-slider-runnable-track]:rounded-full
              [&::-webkit-slider-thumb]:-mt-1.5
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-0
              [&::-moz-range-thumb]:bg-white"
            style={{
              background:
                `linear-gradient(to right, #e11d48 0%, #e11d48 ${progressPercent}%, rgba(255,255,255,0.38) ${progressPercent}%, rgba(255,255,255,0.38) 100%) center / 100% 4px no-repeat`,
            }}
          />

          <span className="order-3 ml-auto w-auto shrink-0 text-right text-[11px] font-medium tabular-nums text-white/70 sm:order-none sm:ml-0 sm:w-16 sm:text-left sm:text-sm">
            {formatTime(
              runtimeSeconds,
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-1 sm:gap-5">
          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={
                togglePlay
              }
              aria-label={
                isPlaying
                  ? "Pause"
                  : "Play"
              }
              aria-keyshortcuts="Space K"
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <PlayIcon
                paused={
                  !isPlaying
                }
              />
            </button>

            <button
              type="button"
              onClick={() =>
                skipBy(-10)
              }
              aria-label="Back 10 seconds"
              aria-keyshortcuts="ArrowLeft J"
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <SkipIcon direction="back" />
            </button>

            <button
              type="button"
              onClick={() =>
                skipBy(10)
              }
              aria-label="Forward 10 seconds"
              aria-keyshortcuts="ArrowRight L"
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <SkipIcon direction="forward" />
            </button>

            <div className="ml-0 hidden items-center gap-1 sm:ml-1 sm:flex">
              <button
                type="button"
                onClick={
                  toggleMute
                }
                aria-label={
                  muted
                    ? "Unmute"
                    : "Mute"
                }
                className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <VolumeIcon
                  muted={
                    muted ||
                    volume === 0
                  }
                />
              </button>

              <input
                aria-label="Volume"
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={
                  muted
                    ? 0
                    : volume
                }
                onChange={
                  (event) => {
                    const video =
                      videoRef.current;

                    if (!video) {
                      return;
                    }

                    const next =
                      Number(
                        event
                          .currentTarget
                          .value,
                      );

                    video.volume =
                      next;

                    video.muted =
                      false;

                    setVolume(
                      next,
                    );

                    setMuted(
                      false,
                    );

                    revealControls();
                  }
                }
                className="hidden h-4 w-20 cursor-pointer accent-white md:block"
              />
            </div>
          </div>

          <div className="relative flex items-center gap-1 sm:gap-2">
            <button
              ref={settingsButtonRef}
              type="button"
              onClick={
                toggleSettingsMenu
              }
              aria-label="Playback settings"
              aria-expanded={
                settingsMenuOpen
              }
              aria-controls="pazora-playback-settings"
              className={[
                "inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                settingsMenuOpen
                  ? "bg-white text-black"
                  : "hover:bg-white/10",
              ].join(" ")}
            >
              <SettingsIcon />
            </button>

            {settingsMenuOpen ? (
              <div
                id="pazora-playback-settings"
                role="dialog"
                aria-label="Playback settings"
                className="absolute bottom-14 right-0 max-h-[72dvh] w-[calc(100vw-1.5rem)] max-w-[22rem] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-[#151515]/95 p-3 shadow-2xl backdrop-blur-xl sm:right-12 sm:max-h-[70vh] [&_button]:min-h-11"
              >
                <div className="px-2 pb-3 pt-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                    Playback speed
                  </p>

                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                    {playbackRateOptions.map(
                      (rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() =>
                            changePlaybackRate(
                              rate,
                            )
                          }
                          className={[
                            "rounded-lg px-2 py-2 text-sm font-medium transition",
                            playbackRate ===
                            rate
                              ? "bg-white text-black"
                              : "bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white",
                          ].join(" ")}
                        >
                          {rate}x
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {transport
                  .audioOptions
                  .length > 0 ? (
                  <div className="border-t border-white/10 px-2 pb-3 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                        Audio
                      </p>

                      {isChangingTransport ? (
                        <span className="text-[10px] font-medium text-white/40">
                          Switching...
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 space-y-1">
                      {transport.audioOptions.map(
                        (option) => (
                          <button
                            key={
                              option.index
                            }
                            type="button"
                            disabled={
                              isChangingTransport ||
                              option.index ===
                                transport
                                  .audioStreamIndex
                            }
                            onClick={() => {
                              void switchTransport(
                                option.index,
                                transport
                                  .qualityMode,
                                selectedSubtitleIndexRef
                                  .current,
                              );
                            }}
                            className={[
                              "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition disabled:cursor-default",
                              option.index ===
                              transport
                                .audioStreamIndex
                                ? "bg-white text-black"
                                : "bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white",
                              isChangingTransport &&
                              option.index !==
                                transport
                                  .audioStreamIndex
                                ? "opacity-50"
                                : "",
                            ].join(" ")}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">
                                {
                                  option.label
                                }
                              </span>

                              <span
                                className={[
                                  "mt-0.5 block truncate text-[10px]",
                                  option.index ===
                                  transport
                                    .audioStreamIndex
                                    ? "text-black/55"
                                    : "text-white/35",
                                ].join(" ")}
                              >
                                {[
                                  option.language,
                                  option.codec
                                    ?.toUpperCase(),
                                  option.channels
                                    ? `${option.channels} ch`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </span>
                            </span>

                            {option.index ===
                            transport
                              .audioStreamIndex ? (
                              <span
                                aria-hidden="true"
                                className="shrink-0"
                              >
                                {"\u2713"}
                              </span>
                            ) : null}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}

                {transport
                  .qualityOptions
                  .length > 0 ? (
                  <div className="border-t border-white/10 px-2 pb-3 pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      Quality
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {transport.qualityOptions.map(
                        (option) => (
                          <button
                            key={
                              option.mode
                            }
                            type="button"
                            disabled={
                              isChangingTransport ||
                              option.mode ===
                                transport
                                  .qualityMode
                            }
                            onClick={() => {
                              void switchTransport(
                                transport
                                  .audioStreamIndex,
                                option.mode,
                                selectedSubtitleIndexRef
                                  .current,
                              );
                            }}
                            className={[
                              "rounded-lg px-3 py-2.5 text-sm font-medium transition disabled:cursor-default",
                              option.mode ===
                              transport
                                .qualityMode
                                ? "bg-white text-black"
                                : "bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white",
                              isChangingTransport &&
                              option.mode !==
                                transport
                                  .qualityMode
                                ? "opacity-50"
                                : "",
                            ].join(" ")}
                          >
                            {
                              option.label
                            }
                          </button>
                        ),
                      )}
                    </div>

                    {streamChangeError ? (
                      <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-200">
                        {
                          streamChangeError
                        }
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {transport
                  .subtitleTracks
                  .some(
                    (track) =>
                      track.delivery ===
                      "external",
                  ) ? (
                  <div className="border-t border-white/10 px-2 pb-2 pt-4">
                    {selectedSubtitle?.delivery ===
                    "external" ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                            Subtitle sync
                          </p>

                          <span className="text-xs font-medium tabular-nums text-white/65">
                            {formatSubtitleDelay(
                              subtitleDelaySeconds,
                            )}
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSubtitleDelaySeconds(
                                (current) =>
                                  clamp(
                                    current -
                                      subtitleDelayStepSeconds,
                                    -subtitleDelayLimitSeconds,
                                    subtitleDelayLimitSeconds,
                                  ),
                              );

                              revealControls();
                            }}
                            className="rounded-lg bg-white/[0.05] px-2 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                          >
                            -0.25s
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSubtitleDelaySeconds(
                                0,
                              );

                              revealControls();
                            }}
                            className={[
                              "rounded-lg px-2 py-2 text-xs font-medium transition",
                              Math.abs(
                                subtitleDelaySeconds,
                              ) < 0.001
                                ? "bg-white text-black"
                                : "bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white",
                            ].join(" ")}
                          >
                            Reset
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSubtitleDelaySeconds(
                                (current) =>
                                  clamp(
                                    current +
                                      subtitleDelayStepSeconds,
                                    -subtitleDelayLimitSeconds,
                                    subtitleDelayLimitSeconds,
                                  ),
                              );

                              revealControls();
                            }}
                            className="rounded-lg bg-white/[0.05] px-2 py-2 text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                          >
                            +0.25s
                          </button>
                        </div>

                        <p className="mt-2 text-[10px] leading-4 text-white/35">
                          Positive values delay subtitles that appear too early.
                        </p>

                        <div className="my-4 border-t border-white/10" />
                      </>
                    ) : null}

                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      Subtitle size
                    </p>

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {subtitleSizeOptions.map(
                        (option) => (
                          <button
                            key={
                              option.value
                            }
                            type="button"
                            onClick={() => {
                              setSubtitleSize(
                                option.value,
                              );

                              revealControls();
                            }}
                            className={[
                              "rounded-lg px-2 py-2 text-xs font-medium transition",
                              subtitleSize ===
                              option.value
                                ? "bg-white text-black"
                                : "bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white",
                            ].join(" ")}
                          >
                            {
                              option.label
                            }
                          </button>
                        ),
                      )}
                    </div>

                    <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      Subtitle background
                    </p>

                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {subtitleBackdropOptions.map(
                        (option) => (
                          <button
                            key={
                              option.value
                            }
                            type="button"
                            onClick={() => {
                              setSubtitleBackdrop(
                                option.value,
                              );

                              revealControls();
                            }}
                            className={[
                              "rounded-lg px-2 py-2 text-xs font-medium transition",
                              subtitleBackdrop ===
                              option.value
                                ? "bg-white text-black"
                                : "bg-white/[0.05] text-white/70 hover:bg-white/10 hover:text-white",
                            ].join(" ")}
                          >
                            {
                              option.label
                            }
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              ref={subtitleButtonRef}
              type="button"
              onClick={
                toggleSubtitleMenu
              }
              disabled={
                transport
                  .subtitleTracks
                  .length === 0
              }
              aria-label="Subtitles"
              aria-expanded={
                subtitleMenuOpen
              }
              aria-controls="pazora-subtitles-menu"
              aria-keyshortcuts="C"
              className={[
                "inline-flex h-11 min-w-11 touch-manipulation items-center justify-center rounded-full px-2 text-sm font-bold tracking-[-0.04em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white",
                selectedSubtitleIndex !==
                null
                  ? "bg-white text-black hover:bg-white/90"
                  : "hover:bg-white/10",
                transport
                  .subtitleTracks
                  .length === 0
                  ? "cursor-not-allowed opacity-30"
                  : "",
              ].join(" ")}
            >
              CC
            </button>

            {subtitleMenuOpen ? (
              <div
                id="pazora-subtitles-menu"
                role="dialog"
                aria-label="Subtitles"
                className="absolute bottom-14 right-0 max-h-[60dvh] w-[calc(100vw-1.5rem)] max-w-72 overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-[#151515]/95 p-2 shadow-2xl backdrop-blur-xl [&_button]:min-h-11"
              >
                <p className="px-3 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Subtitles
                </p>

                <button
                  type="button"
                  onClick={() =>
                    selectSubtitle(
                      null,
                    )
                  }
                  className={[
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition",
                    selectedSubtitleIndex ===
                    null
                      ? "bg-white/10 text-white"
                      : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                  ].join(" ")}
                >
                  <span>
                    Off
                  </span>

                  {selectedSubtitleIndex ===
                  null ? (
                    <span
                      aria-hidden="true"
                      className="text-[#fb7185]"
                    >
                      {"\u2713"}
                    </span>
                  ) : null}
                </button>

                {transport.subtitleTracks.map(
                  (track) => (
                    <button
                      key={
                        track.index
                      }
                      type="button"
                      onClick={() =>
                        selectSubtitle(
                          track.index,
                        )
                      }
                      className={[
                        "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                        selectedSubtitleIndex ===
                        track.index
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:bg-white/[0.06] hover:text-white",
                      ].join(" ")}
                    >
                      <span className="min-w-0 truncate">
                        {
                          track.label
                        }
                      </span>

                      {selectedSubtitleIndex ===
                      track.index ? (
                        <span
                          aria-hidden="true"
                          className="shrink-0 text-[#fb7185]"
                        >
                          {"\u2713"}
                        </span>
                      ) : null}
                    </button>
                  ),
                )}
              </div>
            ) : null}

            <button
              type="button"
              onClick={
                toggleFullscreen
              }
              aria-label={
                fullscreen
                  ? "Exit fullscreen"
                  : "Enter fullscreen"
              }
              aria-keyshortcuts="F"
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <FullscreenIcon />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}