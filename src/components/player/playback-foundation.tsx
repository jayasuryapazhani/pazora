import Link from "next/link";

import type {
  MediaItem,
} from "@/types/media";
import type {
  PlaybackMethod,
  PlaybackPlan,
  PlaybackSource,
} from "@/types/playback";

type PlaybackFoundationProps = {
  item: MediaItem;
  playback: PlaybackPlan;
};

function methodLabel(
  method: PlaybackMethod,
): string {
  switch (method) {
    case "direct-play":
      return "Direct Play available";

    case "direct-stream":
      return "Direct Stream available";

    case "transcode":
      return "Transcode available";

    case "unsupported":
      return "No server method";
  }
}

function formatTicks(
  ticks: number,
): string {
  const seconds =
    Math.floor(
      ticks / 10_000_000,
    );

  const hours =
    Math.floor(
      seconds / 3600,
    );

  const minutes =
    Math.floor(
      (seconds % 3600) / 60,
    );

  const remainingSeconds =
    seconds % 60;

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

function preferredSource(
  playback: PlaybackPlan,
): PlaybackSource | null {
  if (
    playback.preferredSourceId
  ) {
    const preferred =
      playback.sources.find(
        (source) =>
          source.id ===
          playback.preferredSourceId,
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

function codecSummary(
  source: PlaybackSource | null,
): string {
  if (!source) {
    return "Unknown";
  }

  const video =
    source.videoTracks[0]?.codec ??
    null;

  const audio =
    source.audioTracks[0]?.codec ??
    null;

  return (
    [video, audio]
      .filter(Boolean)
      .join(" + ") ||
    "Unknown"
  );
}

function resolutionSummary(
  source: PlaybackSource | null,
): string | null {
  const video =
    source?.videoTracks[0];

  if (
    !video ||
    video.width === null ||
    video.height === null
  ) {
    return null;
  }

  return (
    `${video.width} x ` +
    `${video.height}`
  );
}

export function PlaybackFoundation({
  item,
  playback,
}: PlaybackFoundationProps) {
  const source =
    preferredSource(
      playback,
    );

  const backdrop =
    item.artwork.backdropUrl ??
    item.artwork.posterUrl;

  const resolution =
    resolutionSummary(source);

  const sourceStatus =
    playback.sources.length > 0
      ? `${playback.sources.length} source${
          playback.sources.length === 1
            ? ""
            : "s"
        }`
      : "No media sources";

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#070709] text-white">
      {backdrop ? (
        <div
          role="img"
          aria-label={`${item.name} backdrop`}
          className="absolute inset-0 bg-cover bg-center opacity-35"
          style={{
            backgroundImage:
              `url("${backdrop}")`,
          }}
        />
      ) : null}

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,7,9,0.98)_0%,rgba(7,7,9,0.88)_42%,rgba(7,7,9,0.58)_72%,rgba(7,7,9,0.90)_100%)]"
      />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#070709] via-[#070709]/70 to-transparent"
      />

      <div className="pazora-page-gutter relative z-10 flex min-h-screen items-center py-20">
        <div className="w-full max-w-3xl">
          <Link
            href={`/title/${item.id}`}
            prefetch={false}
            className="inline-flex items-center gap-2 text-xs font-medium text-white/45 transition hover:text-white"
          >
            <span aria-hidden="true">
              {"\u2190"}
            </span>

            Back to details
          </Link>

          <p className="mt-12 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d3203f]">
            Pazora Player Foundation
          </p>

          <h1 className="mt-3 max-w-[18ch] text-[clamp(2.7rem,6vw,5.7rem)] font-bold leading-[0.96] tracking-[-0.05em]">
            {item.name}
          </h1>

          {item.seriesName ? (
            <p className="mt-3 text-sm text-white/45">
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

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#d3203f]/30 bg-[#d3203f]/10 px-3 py-1.5 text-[11px] font-semibold text-[#f27a8f]">
              {methodLabel(
                playback.serverPreferredMethod,
              )}
            </span>

            <span className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-[11px] text-white/55">
              {sourceStatus}
            </span>

            {source?.container ? (
              <span className="rounded-full border border-white/[0.09] bg-white/[0.035] px-3 py-1.5 text-[11px] uppercase text-white/55">
                {source.container}
              </span>
            ) : null}
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/[0.07] bg-black/25 px-4 py-4 backdrop-blur">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                Resume
              </p>

              <p className="mt-2 text-sm font-medium text-white/75">
                {playback.resumePositionTicks >
                0
                  ? formatTicks(
                      playback.resumePositionTicks,
                    )
                  : "From beginning"}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-black/25 px-4 py-4 backdrop-blur">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                Codecs
              </p>

              <p className="mt-2 text-sm font-medium uppercase text-white/75">
                {codecSummary(source)}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-black/25 px-4 py-4 backdrop-blur">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                Video
              </p>

              <p className="mt-2 text-sm font-medium text-white/75">
                {resolution ??
                  "Unknown resolution"}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.07] bg-black/25 px-4 py-4 backdrop-blur">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
                Tracks
              </p>

              <p className="mt-2 text-sm font-medium text-white/75">
                {source
                  ? `${source.audioTracks.length} audio \u2022 ${source.subtitleTracks.length} subtitle`
                  : "Unavailable"}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-white/[0.07] bg-black/30 px-5 py-5 backdrop-blur">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#d3203f]"
              />

              <div>
                <p className="text-sm font-medium text-white/80">
                  Playback control plane ready
                </p>

                <p className="mt-1.5 max-w-2xl text-xs leading-5 text-white/40">
                  Jellyfin source metadata and resume state are ready. Browser codec compatibility and secure browser-to-Jellyfin media transport are intentionally handled in the next playback step.
                </p>
              </div>
            </div>
          </div>

          {playback.errorCode ? (
            <p className="mt-5 text-xs text-amber-200/70">
              Jellyfin playback status:
              {" "}
              {playback.errorCode}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}