"use client";

import Link from "next/link";

import {
  formatProgress,
  formatRating,
  formatRuntime,
} from "@/lib/utils/media-format";
import type {
  MediaItem,
} from "@/types/media";

type MediaCardProps = {
  item: MediaItem;
  variant: "poster" | "landscape";
  expanded: boolean;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onEscape: () => void;
};

function getCollapsedArtwork(
  item: MediaItem,
  variant: MediaCardProps["variant"],
): string | null {
  if (variant === "landscape") {
    return (
      item.artwork.backdropUrl ??
      item.artwork.posterUrl
    );
  }

  return (
    item.artwork.posterUrl ??
    item.artwork.backdropUrl
  );
}

function getExpandedArtwork(
  item: MediaItem,
): string | null {
  return (
    item.artwork.backdropUrl ??
    item.artwork.posterUrl
  );
}

function getTypeLabel(
  item: MediaItem,
): string {
  if (item.type === "BoxSet") {
    return "Collection";
  }

  if (
    item.type === "Episode" &&
    item.parentIndexNumber !== null &&
    item.indexNumber !== null
  ) {
    return (
      `S${item.parentIndexNumber} ` +
      `E${item.indexNumber}`
    );
  }

  return item.type;
}

export function MediaCard({
  item,
  variant,
  expanded,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  onEscape,
}: MediaCardProps) {
  const collapsedArtwork =
    getCollapsedArtwork(
      item,
      variant,
    );

  const expandedArtwork =
    getExpandedArtwork(item);

  const runtime =
    formatRuntime(
      item.runtimeTicks,
    );

  const rating =
    formatRating(
      item.communityRating,
    );

  const progress =
    formatProgress(
      item.user.playedPercentage,
    );

  const progressValue =
    Math.min(
      100,
      Math.max(
        0,
        item.user.playedPercentage ?? 0,
      ),
    );

  const isLandscape =
    variant === "landscape";

  const genres =
    item.genres
      .slice(0, 3)
      .join(" \u2022 ");

  const status = progress
    ? progress
    : item.user.played
      ? "Watched"
      : null;

  const metadata = [
    item.productionYear !== null
      ? `${item.productionYear}`
      : null,
    item.officialRating,
    runtime,
    rating
      ? `\u2605 ${rating}`
      : null,
  ].filter(
    (
      value,
    ): value is string =>
      typeof value === "string" &&
      value.length > 0,
  );

  return (
    <Link
      href={`/title/${item.id}`}
      prefetch={false}
      aria-label={`Open ${item.name}`}
      onPointerEnter={
        onPointerEnter
      }
      onPointerLeave={
        onPointerLeave
      }
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onEscape();
        }
      }}
      className="group relative block h-full w-full rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d]"
    >
      <article
        title={item.name}
        className="relative h-full w-full"
      >
        {/* ======================================================
            COLLAPSED CARD

            This remains mounted while expansion happens.
            It simply fades away instead of being replaced.
           ====================================================== */}
        <div
          aria-hidden={
            expanded
              ? "true"
              : undefined
          }
          className={[
            "absolute inset-0 transition-[opacity,transform] duration-200 ease-out",
            expanded
              ? "pointer-events-none scale-[0.985] opacity-0"
              : "scale-100 opacity-100",
          ].join(" ")}
        >
          {isLandscape ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-md bg-[#1a1a1e] shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
              {collapsedArtwork ? (
                <div
                  role="img"
                  aria-label={`${item.name} artwork`}
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.018]"
                  style={{
                    backgroundImage:
                      `url("${collapsedArtwork}")`,
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(211,32,63,0.18),transparent_42%),linear-gradient(145deg,#1c1c21,#0f0f12)]">
                  <span className="text-[10px] font-semibold tracking-[0.22em] text-[#d3203f]">
                    PAZORA
                  </span>
                </div>
              )}

              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent"
              />

              <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3">
                <p className="truncate text-sm font-semibold text-white drop-shadow">
                  {item.name}
                </p>

                <div className="mt-1.5 flex items-center gap-2 text-[11px] text-white/55">
                  {progress ? (
                    <span>
                      {progress}
                    </span>
                  ) : null}

                  {runtime ? (
                    <span>
                      {runtime}
                    </span>
                  ) : null}
                </div>
              </div>

              {progressValue > 0 ? (
                <div className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/15">
                  <div
                    className="h-full bg-[#d3203f]"
                    style={{
                      width:
                        `${progressValue}%`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-md bg-[#1a1a1e] shadow-[0_12px_32px_rgba(0,0,0,0.22)]">
                {collapsedArtwork ? (
                  <div
                    role="img"
                    aria-label={`${item.name} artwork`}
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.018]"
                    style={{
                      backgroundImage:
                        `url("${collapsedArtwork}")`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(211,32,63,0.18),transparent_42%),linear-gradient(145deg,#1c1c21,#0f0f12)]">
                    <span className="text-[10px] font-semibold tracking-[0.22em] text-[#d3203f]">
                      PAZORA
                    </span>
                  </div>
                )}
              </div>

              <div className="h-11 shrink-0 pt-2.5">
                <p className="truncate text-[13px] font-medium text-white/82">
                  {item.name}
                </p>

                <div className="mt-1 flex items-center gap-2 text-[11px] text-white/35">
                  {item.productionYear ? (
                    <span>
                      {item.productionYear}
                    </span>
                  ) : null}

                  {item.officialRating ? (
                    <span>
                      {item.officialRating}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>


        {/* ======================================================
            EXPANDED CARD

            One continuous artwork surface.
            No right-side information panel.
            The row wrapper supplies the animated width + height.
           ====================================================== */}
        <div
          aria-hidden={
            expanded
              ? undefined
              : "true"
          }
          className={[
            "absolute inset-0 overflow-hidden rounded-xl border border-white/[0.10] bg-[#161619] transition-[opacity,transform,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            expanded
              ? "scale-100 opacity-100 shadow-[0_26px_72px_rgba(0,0,0,0.62)]"
              : "pointer-events-none scale-[0.975] opacity-0 shadow-none",
          ].join(" ")}
        >
          {expandedArtwork ? (
            <div
              role="img"
              aria-label={`${item.name} expanded artwork`}
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-[1.018]"
              style={{
                backgroundImage:
                  `url("${expandedArtwork}")`,
              }}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(211,32,63,0.20),transparent_45%),linear-gradient(145deg,#25252b,#111114)]">
              <span className="text-xs font-semibold tracking-[0.25em] text-[#d3203f]">
                PAZORA
              </span>
            </div>
          )}

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black via-black/48 to-transparent"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-black/28 via-transparent to-black/10"
          />

          <div className="absolute inset-x-0 bottom-0 z-10 p-5 sm:p-6">
            <div className="flex items-end justify-between gap-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-semibold uppercase tracking-[0.10em] text-white/45 sm:text-[11px]">
                  <span>
                    {getTypeLabel(item)}
                  </span>

                  {status ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-0.5 w-0.5 rounded-full bg-white/35"
                      />

                      <span className="text-[#ef6079]">
                        {status}
                      </span>
                    </>
                  ) : null}

                  {item.user.favorite ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="h-0.5 w-0.5 rounded-full bg-white/35"
                      />

                      <span>
                        Favorite
                      </span>
                    </>
                  ) : null}
                </div>

                <h3 className="mt-2 line-clamp-2 max-w-[24ch] text-xl font-semibold leading-tight tracking-[-0.02em] text-white sm:text-2xl">
                  {item.name}
                </h3>

                {metadata.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-white/68 sm:text-xs">
                    {metadata.map(
                      (value, index) => (
                        <span
                          key={`${value}-${index}`}
                          className="inline-flex items-center gap-2"
                        >
                          {index > 0 ? (
                            <span
                              aria-hidden="true"
                              className="h-0.5 w-0.5 rounded-full bg-white/35"
                            />
                          ) : null}

                          {value}
                        </span>
                      ),
                    )}
                  </div>
                ) : null}

                {item.overview ? (
                  <p className="mt-3 line-clamp-2 max-w-[48rem] text-xs leading-5 text-white/65 sm:text-[13px]">
                    {item.overview}
                  </p>
                ) : null}

                {genres ? (
                  <p className="mt-2.5 truncate text-[11px] text-white/42">
                    {genres}
                  </p>
                ) : null}
              </div>

              <span
                aria-hidden="true"
                className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/35 bg-black/25 text-white/90 backdrop-blur-sm"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </div>

            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-white/82">
              <span>
                Details
              </span>

              <span aria-hidden="true">{"\u2192"}</span>
            </div>
          </div>

          {progressValue > 0 ? (
            <div className="absolute inset-x-0 bottom-0 z-20 h-[3px] bg-white/20">
              <div
                className="h-full bg-[#d3203f]"
                style={{
                  width:
                    `${progressValue}%`,
                }}
              />
            </div>
          ) : null}
        </div>
      </article>
    </Link>
  );
}