"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";

import {
  MediaProgress,
} from "@/components/media/media-progress";
import {
  formatRating,
  formatRuntime,
} from "@/lib/utils/media-format";
import type {
  MediaItem,
} from "@/types/media";

export type HomeHeroSlide = {
  item: MediaItem;
  sourceLabel: string;
};

type HomeHeroProps = {
  slides: HomeHeroSlide[];
  browseTarget: string | null;
  browseLabel: string | null;
};

const carouselIntervalMs = 8500;

function heroTitleClass(
  title: string,
): string {
  if (title.length >= 46) {
    return (
      "text-[clamp(2.05rem,3.15vw,3.65rem)]"
    );
  }

  if (title.length >= 30) {
    return (
      "text-[clamp(2.25rem,3.55vw,4rem)]"
    );
  }

  return (
    "text-[clamp(2.55rem,3.9vw,4.45rem)]"
  );
}

function getBackdrop(
  item: MediaItem,
): string | null {
  return (
    item.artwork.backdropUrl ??
    item.artwork.posterUrl
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
      />

      <path d="M12 11v5" />

      <path d="M12 8h.01" />
    </svg>
  );
}

function ArrowIcon({
  direction,
}: {
  direction: "previous" | "next";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={[
        "h-4 w-4",
        direction === "previous"
          ? "rotate-180"
          : "",
      ].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function HomeHero({
  slides,
  browseTarget,
  browseLabel,
}: HomeHeroProps) {
  const [activeIndex, setActiveIndex] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

  const safeIndex =
    slides.length === 0
      ? 0
      : activeIndex %
        slides.length;

  const activeSlide =
    slides[safeIndex] ??
    null;

  const item =
    activeSlide?.item ??
    null;

  const backdrop =
    item
      ? getBackdrop(item)
      : null;

  const runtime =
    item
      ? formatRuntime(
          item.runtimeTicks,
        )
      : null;

  const rating =
    item
      ? formatRating(
          item.communityRating,
        )
      : null;

  useEffect(() => {
    if (
      slides.length <= 1 ||
      paused
    ) {
      return;
    }

    const reduceMotion =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

    if (reduceMotion) {
      return;
    }

    const timer =
      window.setInterval(
        () => {
          setActiveIndex(
            (current) =>
              (
                current + 1
              ) %
              slides.length,
          );
        },
        carouselIntervalMs,
      );

    return () => {
      window.clearInterval(timer);
    };
  }, [
    paused,
    slides.length,
  ]);

  useEffect(() => {
    if (slides.length <= 1) {
      return;
    }

    const nextIndex =
      (
        safeIndex + 1
      ) %
      slides.length;

    const nextItem =
      slides[nextIndex]?.item;

    if (!nextItem) {
      return;
    }

    const nextBackdrop =
      getBackdrop(nextItem);

    if (!nextBackdrop) {
      return;
    }

    const image =
      new window.Image();

    image.decoding =
      "async";

    image.src =
      nextBackdrop;
  }, [
    safeIndex,
    slides,
  ]);

  function moveSlide(
    direction:
      | "previous"
      | "next",
  ) {
    if (slides.length <= 1) {
      return;
    }

    setActiveIndex(
      (current) => {
        const normalized =
          current %
          slides.length;

        if (
          direction === "next"
        ) {
          return (
            normalized + 1
          ) %
            slides.length;
        }

        return (
          normalized -
          1 +
          slides.length
        ) %
          slides.length;
      },
    );
  }

  return (
    <section
      id="top"
      aria-roledescription="carousel"
      aria-label="Featured movies"
      onPointerEnter={() => {
        setPaused(true);
      }}
      onPointerLeave={() => {
        setPaused(false);
      }}
      onFocusCapture={() => {
        setPaused(true);
      }}
      onBlurCapture={() => {
        setPaused(false);
      }}
      className="relative h-[80vh] min-h-[680px] max-h-[900px] overflow-hidden"
    >
      {backdrop ? (
        <div
          key={`backdrop-${item?.id}`}
          role="img"
          aria-label={`${item?.name ?? "Featured"} backdrop`}
          className="pazora-hero-slide-enter absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              `url("${backdrop}")`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(211,32,63,0.19),transparent_34%),linear-gradient(115deg,#15151a,#08080a_68%)]" />
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/64 to-transparent"
      />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/60 via-black/25 to-transparent"
      />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/70 to-transparent"
      />

      <div className="pazora-page-gutter relative z-10 flex h-full items-center pb-28 pt-[calc(var(--pazora-header-height)+3rem)] sm:pb-32 lg:pb-36">
        {item ? (
          <div
            key={`content-${item.id}`}
            className="pazora-content-enter w-full max-w-[780px]"
          >
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45 sm:text-xs">
              {activeSlide?.sourceLabel
                ? `${activeSlide.sourceLabel} on Pazora`
                : "Featured on Pazora"}
            </p>

            <h1
              className={[
                "max-w-[23ch] text-balance font-bold leading-[0.99] tracking-[-0.042em] text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.48)]",
                heroTitleClass(
                  item.name,
                ),
              ].join(" ")}
            >
              {item.name}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-white/70">
              {item.productionYear ? (
                <span>
                  {item.productionYear}
                </span>
              ) : null}

              {item.officialRating ? (
                <span className="rounded border border-white/25 px-1.5 py-0.5 text-[11px]">
                  {item.officialRating}
                </span>
              ) : null}

              {runtime ? (
                <span>
                  {runtime}
                </span>
              ) : null}

              {rating ? (
                <span>
                  ★ {rating}
                </span>
              ) : null}
            </div>

            <div className="mt-4">
              <MediaProgress
                percentage={
                  item.user
                    .playedPercentage
                }
                compact
              />
            </div>

            {item.overview ? (
              <p className="mt-5 line-clamp-3 max-w-[60ch] text-[15px] leading-6 text-white/68 sm:text-base sm:leading-7">
                {item.overview}
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={`/title/${item.id}`}
                prefetch={false}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-black/20 transition duration-200 hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <InfoIcon />

                <span>
                  More Info
                </span>
              </Link>

              {browseTarget &&
              browseLabel ? (
                <a
                  href={
                    browseTarget
                  }
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-white/16 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition duration-200 hover:bg-white/24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                >
                  {browseLabel}
                </a>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="pazora-content-enter max-w-[680px]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d3203f]">
              PAZORA
            </p>

            <h1 className="mt-4 max-w-[14ch] text-balance text-[clamp(2.5rem,4vw,4.4rem)] font-bold leading-none tracking-[-0.04em] text-white">
              Your private library.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-white/55">
              Movies, shows,
              collections and family
              media in one place.
            </p>
          </div>
        )}
      </div>

      {slides.length > 1 ? (
        <div className="pointer-events-none absolute bottom-32 right-[var(--pazora-page-gutter)] z-20 hidden sm:block lg:bottom-36">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/10 bg-black/35 p-1.5 shadow-lg shadow-black/25 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                moveSlide(
                  "previous",
                );
              }}
              aria-label="Show previous featured movie"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/68 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ArrowIcon
                direction="previous"
              />
            </button>

            <span className="min-w-[3.5rem] text-center text-[11px] font-medium tabular-nums text-white/48">
              {safeIndex + 1}
              {" / "}
              {slides.length}
            </span>

            <button
              type="button"
              onClick={() => {
                moveSlide(
                  "next",
                );
              }}
              aria-label="Show next featured movie"
              className="flex h-8 w-8 items-center justify-center rounded-full text-white/68 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <ArrowIcon
                direction="next"
              />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}