"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  MediaProgress,
} from "@/components/media/media-progress";
import {
  formatRating,
  formatRuntime,
} from "@/lib/utils/media-format";
import type {
  MediaEpisodesData,
  MediaItem,
} from "@/types/media";

type SeriesSeasonsProps = {
  seriesId: string;
  seasons: MediaItem[];
  initialEpisodes: MediaEpisodesData | null;
};

type EpisodesResponse =
  | {
      authenticated: true;
      episodes: MediaEpisodesData;
    }
  | {
      authenticated: false;
    }
  | {
      error: string;
    };

function episodeArtwork(
  episode: MediaItem,
): string | null {
  return (
    episode.artwork.backdropUrl ??
    episode.artwork.posterUrl
  );
}

function episodeNumber(
  episode: MediaItem,
): string {
  if (
    episode.parentIndexNumber !== null &&
    episode.indexNumber !== null
  ) {
    return (
      `S${episode.parentIndexNumber} ` +
      `E${episode.indexNumber}`
    );
  }

  if (episode.indexNumber !== null) {
    return `Episode ${episode.indexNumber}`;
  }

  return "Episode";
}

function EpisodeCard({
  episode,
}: {
  episode: MediaItem;
}) {
  const artwork =
    episodeArtwork(episode);

  const runtime =
    formatRuntime(
      episode.runtimeTicks,
    );

  const rating =
    formatRating(
      episode.communityRating,
    );

  const inProgress =
    !episode.user.played &&
    (
      episode.user.playedPercentage ?? 0
    ) > 0;

  return (
    <Link
      href={`/title/${episode.id}`}
      prefetch={false}
      className="group grid gap-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 outline-none transition hover:border-white/[0.13] hover:bg-white/[0.045] focus-visible:ring-2 focus-visible:ring-white/60 sm:grid-cols-[13rem_minmax(0,1fr)]"
    >
      <div className="relative aspect-video overflow-hidden rounded-lg bg-[#19191d]">
        {artwork ? (
          <div
            role="img"
            aria-label={`${episode.name} artwork`}
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.025]"
            style={{
              backgroundImage:
                `url("${artwork}")`,
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(211,32,63,0.18),transparent_42%),linear-gradient(145deg,#222227,#111114)]">
            <span className="text-[9px] font-semibold tracking-[0.22em] text-[#d3203f]">
              PAZORA
            </span>
          </div>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent"
        />

        {episode.user.played ? (
          <span className="absolute left-2.5 top-2.5 rounded-full border border-white/10 bg-black/70 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/65 backdrop-blur">
            Watched
          </span>
        ) : inProgress ? (
          <span className="absolute left-2.5 top-2.5 rounded-full border border-[#d3203f]/30 bg-[#4b0c19]/85 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#f27a8f] backdrop-blur">
            In progress
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
          <MediaProgress
            percentage={
              episode.user.playedPercentage
            }
          />
        </div>
      </div>

      <div className="min-w-0 self-center py-1">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.10em] text-white/35">
          <span>
            {episodeNumber(episode)}
          </span>

          {runtime ? (
            <>
              <span
                aria-hidden="true"
                className="h-0.5 w-0.5 rounded-full bg-white/25"
              />

              <span>
                {runtime}
              </span>
            </>
          ) : null}

          {rating ? (
            <>
              <span
                aria-hidden="true"
                className="h-0.5 w-0.5 rounded-full bg-white/25"
              />

              <span>
                {"\u2605"} {rating}
              </span>
            </>
          ) : null}
        </div>

        <h3 className="mt-2 text-base font-semibold leading-6 text-white/88 transition group-hover:text-white">
          {episode.name}
        </h3>

        {episode.overview ? (
          <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/42 sm:text-[13px]">
            {episode.overview}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function SeriesSeasons({
  seriesId,
  seasons,
  initialEpisodes,
}: SeriesSeasonsProps) {
  const router =
    useRouter();

  const requestRef =
    useRef<AbortController | null>(
      null,
    );

  const initialSeasonId =
    initialEpisodes?.seasonId ??
    seasons[0]?.id ??
    "";

  const [
    selectedSeasonId,
    setSelectedSeasonId,
  ] =
    useState(initialSeasonId);

  const [
    episodes,
    setEpisodes,
  ] =
    useState<MediaItem[]>(
      initialEpisodes?.episodes.items ??
        [],
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      initialEpisodes === null &&
      seasons.length > 0
        ? "Episodes could not be loaded."
        : null,
    );

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  async function loadSeason(
    seasonId: string,
  ) {
    requestRef.current?.abort();

    const controller =
      new AbortController();

    requestRef.current =
      controller;

    setSelectedSeasonId(
      seasonId,
    );

    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/media/items/${encodeURIComponent(seriesId)}/episodes?seasonId=${encodeURIComponent(seasonId)}`,
          {
            cache: "no-store",
            signal:
              controller.signal,
          },
        );

      const payload =
        (
          await response.json()
        ) as EpisodesResponse;

      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }

      if (!response.ok) {
        const message =
          "error" in payload
            ? payload.error
            : "Unable to load episodes.";

        throw new Error(message);
      }

      if (!("episodes" in payload)) {
        throw new Error(
          "Pazora received an invalid episode response.",
        );
      }

      setEpisodes(
        payload.episodes.episodes.items,
      );
    } catch (caught) {
      if (
        controller.signal.aborted
      ) {
        return;
      }

      if (
        caught instanceof DOMException &&
        caught.name === "AbortError"
      ) {
        return;
      }

      setEpisodes([]);

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load episodes.",
      );
    } finally {
      if (
        requestRef.current ===
        controller
      ) {
        setLoading(false);
      }
    }
  }

  const selectedSeason =
    seasons.find(
      (season) =>
        season.id ===
        selectedSeasonId,
    ) ??
    seasons[0] ??
    null;

  if (seasons.length === 0) {
    return null;
  }

  return (
    <section className="pazora-page-gutter pt-4">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/[0.07] pb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d3203f]">
            Episodes
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {selectedSeason?.name ??
              "Season"}
          </h2>
        </div>

        <div
          role="tablist"
          aria-label="Seasons"
          className="flex max-w-full gap-2 overflow-x-auto pb-1"
        >
          {seasons.map(
            (season) => {
              const selected =
                season.id ===
                selectedSeasonId;

              return (
                <button
                  key={season.id}
                  type="button"
                  role="tab"
                  aria-selected={
                    selected
                  }
                  disabled={
                    loading &&
                    selected
                  }
                  onClick={() => {
                    if (
                      season.id ===
                        selectedSeasonId &&
                      episodes.length > 0
                    ) {
                      return;
                    }

                    void loadSeason(
                      season.id,
                    );
                  }}
                  className={[
                    "shrink-0 rounded-full border px-4 py-2 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-white/30",
                    selected
                      ? "border-[#d3203f]/45 bg-[#d3203f]/15 text-[#f27a8f]"
                      : "border-white/[0.09] bg-white/[0.025] text-white/50 hover:border-white/20 hover:text-white",
                  ].join(" ")}
                >
                  {season.name}
                </button>
              );
            },
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-6 flex items-center justify-between gap-5 rounded-xl border border-red-400/15 bg-red-400/[0.055] px-5 py-4">
          <p className="text-sm text-red-200/70">
            {error}
          </p>

          {selectedSeasonId ? (
            <button
              type="button"
              onClick={() => {
                void loadSeason(
                  selectedSeasonId,
                );
              }}
              className="text-xs font-semibold text-red-100 hover:text-white"
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        aria-busy={loading}
        className={[
          "mt-6 grid gap-3 transition-opacity duration-200",
          loading
            ? "pointer-events-none opacity-35"
            : "opacity-100",
        ].join(" ")}
      >
        {episodes.length > 0 ? (
          episodes.map(
            (episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
              />
            ),
          )
        ) : !loading &&
          !error ? (
          <div className="rounded-xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 py-12 text-center">
            <p className="text-sm text-white/45">
              No episodes are available for this season.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}