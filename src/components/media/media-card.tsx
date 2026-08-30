"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  MediaCardPreview,
} from "@/components/media/media-card-preview";
import type {
  MediaCardPreviewPosition,
} from "@/components/media/media-card-preview";
import {
  formatProgress,
  formatRuntime,
} from "@/lib/utils/media-format";
import type {
  MediaItem,
} from "@/types/media";

type MediaCardProps = {
  item: MediaItem;
  variant: "poster" | "landscape";
};

const previewOpenDelayMs = 325;
const previewCloseDelayMs = 130;
const previewMaximumWidth = 340;
const previewViewportGutter = 16;
const previewHeaderClearance = 80;
const previewInformationHeight = 142;

function getArtwork(
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

function supportsHoverPreview(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches
  );
}

function calculatePreviewPosition(
  anchor: HTMLAnchorElement,
): MediaCardPreviewPosition {
  const rect =
    anchor.getBoundingClientRect();

  const width =
    Math.min(
      previewMaximumWidth,
      Math.max(
        1,
        window.innerWidth -
          previewViewportGutter * 2,
      ),
    );

  const estimatedHeight =
    width * (9 / 16) +
    previewInformationHeight;

  const preferredLeft =
    rect.left +
    rect.width / 2 -
    width / 2;

  const maximumLeft =
    Math.max(
      previewViewportGutter,
      window.innerWidth -
        width -
        previewViewportGutter,
    );

  const left =
    Math.min(
      maximumLeft,
      Math.max(
        previewViewportGutter,
        preferredLeft,
      ),
    );

  const minimumTop =
    previewHeaderClearance;

  const maximumTop =
    Math.max(
      minimumTop,
      window.innerHeight -
        estimatedHeight -
        previewViewportGutter,
    );

  const preferredTop =
    rect.top +
    rect.height / 2 -
    estimatedHeight / 2;

  const top =
    Math.min(
      maximumTop,
      Math.max(
        minimumTop,
        preferredTop,
      ),
    );

  const horizontalShift =
    left - preferredLeft;

  const transformOrigin =
    Math.abs(horizontalShift) < 8
      ? "center center"
      : horizontalShift > 0
        ? "left center"
        : "right center";

  return {
    top,
    left,
    width,
    transformOrigin,
  };
}

export function MediaCard({
  item,
  variant,
}: MediaCardProps) {
  const cardRef =
    useRef<HTMLAnchorElement>(null);

  const openTimerRef =
    useRef<number | null>(null);

  const closeTimerRef =
    useRef<number | null>(null);

  const [previewOpen, setPreviewOpen] =
    useState(false);

  const [
    previewPosition,
    setPreviewPosition,
  ] =
    useState<MediaCardPreviewPosition | null>(
      null,
    );

  const artwork =
    getArtwork(item, variant);

  const runtime =
    formatRuntime(
      item.runtimeTicks,
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

  function clearOpenTimer() {
    if (
      openTimerRef.current !== null
    ) {
      window.clearTimeout(
        openTimerRef.current,
      );

      openTimerRef.current = null;
    }
  }

  function clearCloseTimer() {
    if (
      closeTimerRef.current !== null
    ) {
      window.clearTimeout(
        closeTimerRef.current,
      );

      closeTimerRef.current = null;
    }
  }

  function showPreview() {
    if (!supportsHoverPreview()) {
      return;
    }

    const anchor =
      cardRef.current;

    if (!anchor) {
      return;
    }

    clearOpenTimer();
    clearCloseTimer();

    setPreviewPosition(
      calculatePreviewPosition(
        anchor,
      ),
    );

    setPreviewOpen(true);
  }

  function schedulePreviewOpen() {
    if (!supportsHoverPreview()) {
      return;
    }

    clearOpenTimer();
    clearCloseTimer();

    openTimerRef.current =
      window.setTimeout(
        () => {
          openTimerRef.current =
            null;

          showPreview();
        },
        previewOpenDelayMs,
      );
  }

  function schedulePreviewClose() {
    clearOpenTimer();
    clearCloseTimer();

    closeTimerRef.current =
      window.setTimeout(
        () => {
          closeTimerRef.current =
            null;

          setPreviewOpen(false);
        },
        previewCloseDelayMs,
      );
  }

  function keepPreviewOpen() {
    clearCloseTimer();
  }

  function closePreviewNow() {
    clearOpenTimer();
    clearCloseTimer();
    setPreviewOpen(false);
  }

  useEffect(() => {
    return () => {
      if (
        openTimerRef.current !== null
      ) {
        window.clearTimeout(
          openTimerRef.current,
        );
      }

      if (
        closeTimerRef.current !== null
      ) {
        window.clearTimeout(
          closeTimerRef.current,
        );
      }
    };
  }, []);

  useEffect(() => {
    if (!previewOpen) {
      return;
    }

    function dismissPreview() {
      if (
        openTimerRef.current !== null
      ) {
        window.clearTimeout(
          openTimerRef.current,
        );

        openTimerRef.current = null;
      }

      if (
        closeTimerRef.current !== null
      ) {
        window.clearTimeout(
          closeTimerRef.current,
        );

        closeTimerRef.current = null;
      }

      setPreviewOpen(false);
    }

    window.addEventListener(
      "resize",
      dismissPreview,
    );

    window.addEventListener(
      "scroll",
      dismissPreview,
      true,
    );

    return () => {
      window.removeEventListener(
        "resize",
        dismissPreview,
      );

      window.removeEventListener(
        "scroll",
        dismissPreview,
        true,
      );
    };
  }, [previewOpen]);

  return (
    <>
      <Link
        ref={cardRef}
        href={`/title/${item.id}`}
        prefetch={false}
        aria-label={`Open ${item.name}`}
        onPointerEnter={
          schedulePreviewOpen
        }
        onPointerLeave={
          schedulePreviewClose
        }
        onFocus={showPreview}
        onBlur={
          schedulePreviewClose
        }
        onKeyDown={(event) => {
          if (
            event.key === "Escape"
          ) {
            event.preventDefault();
            closePreviewNow();
          }
        }}
        className={[
          "group block shrink-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0b0d]",
          isLandscape
            ? "w-[clamp(15rem,23vw,22rem)]"
            : "w-[clamp(9.25rem,13vw,12rem)]",
        ].join(" ")}
      >
        <article
          title={item.name}
        >
          <div
            className={[
              "relative isolate overflow-hidden bg-[#1a1a1e] shadow-[0_12px_32px_rgba(0,0,0,0.22)] transition-[filter,box-shadow] duration-200 ease-out group-hover:brightness-[1.035] group-hover:shadow-[0_18px_42px_rgba(0,0,0,0.38)]",
              isLandscape
                ? "aspect-video rounded-md"
                : "aspect-[2/3] rounded-md",
            ].join(" ")}
          >
            {artwork ? (
              <div
                role="img"
                aria-label={`${item.name} artwork`}
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 ease-out group-hover:scale-[1.018]"
                style={{
                  backgroundImage:
                    `url("${artwork}")`,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(211,32,63,0.18),transparent_42%),linear-gradient(145deg,#1c1c21,#0f0f12)] p-5 text-center">
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.22em] text-[#d3203f]">
                    PAZORA
                  </p>

                  <p className="mt-3 line-clamp-3 text-sm font-medium text-white/80">
                    {item.name}
                  </p>
                </div>
              </div>
            )}

            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
            />

            {isLandscape ? (
              <>
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
              </>
            ) : null}
          </div>

          {!isLandscape ? (
            <div className="mt-2.5 min-w-0">
              <p className="truncate text-[13px] font-medium text-white/82 transition group-hover:text-white">
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
          ) : null}
        </article>
      </Link>

      <MediaCardPreview
        item={item}
        open={previewOpen}
        position={previewPosition}
        onPointerEnter={
          keepPreviewOpen
        }
        onPointerLeave={
          schedulePreviewClose
        }
        onNavigate={
          closePreviewNow
        }
      />
    </>
  );
}