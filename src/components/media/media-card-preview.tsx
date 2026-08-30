"use client";

import Link from "next/link";
import {
  createPortal,
} from "react-dom";

import {
  formatProgress,
  formatRating,
  formatRuntime,
} from "@/lib/utils/media-format";
import type {
  MediaItem,
} from "@/types/media";

export type MediaCardPreviewPosition = {
  top: number;
  left: number;
  width: number;
  transformOrigin: string;
};

type MediaCardPreviewProps = {
  item: MediaItem;
  open: boolean;
  position: MediaCardPreviewPosition | null;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onNavigate: () => void;
};

function getPreviewArtwork(
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

export function MediaCardPreview({
  item,
  open,
  position,
  onPointerEnter,
  onPointerLeave,
  onNavigate,
}: MediaCardPreviewProps) {
  if (
    !open ||
    position === null ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const artwork =
    getPreviewArtwork(item);

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

  const genres =
    item.genres
      .slice(0, 3)
      .join(" • ");

  const statusLabels: string[] = [];

  if (progress) {
    statusLabels.push(progress);
  } else if (item.user.played) {
    statusLabels.push("Watched");
  }

  if (item.user.favorite) {
    statusLabels.push("Favorite");
  }

  const metadata = [
    item.productionYear,
    item.officialRating,
    runtime,
    rating
      ? `★ ${rating}`
      : null,
  ].filter(
    (
      value,
    ): value is string | number =>
      value !== null &&
      value !== undefined,
  );

  return createPortal(
    <Link
      href={`/title/${item.id}`}
      prefetch={false}
      tabIndex={-1}
      aria-label={`View details for ${item.name}`}
      onPointerEnter={
        onPointerEnter
      }
      onPointerLeave={
        onPointerLeave
      }
      onClick={onNavigate}
      className="pazora-preview-enter fixed z-[80] block overflow-hidden rounded-lg border border-white/[0.08] bg-[#18181c] text-white shadow-[0_28px_90px_rgba(0,0,0,0.78)] outline-none"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        transformOrigin:
          position.transformOrigin,
      }}
    >
      <div className="relative aspect-video overflow-hidden bg-[#202026]">
        {artwork ? (
          <div
            role="img"
            aria-label={`${item.name} preview artwork`}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                `url("${artwork}")`,
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_50%_28%,rgba(211,32,63,0.2),transparent_45%),linear-gradient(145deg,#25252b,#111114)]">
            <span className="text-[11px] font-semibold tracking-[0.24em] text-[#d3203f]">
              PAZORA
            </span>
          </div>
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent"
        />

        {progressValue > 0 ? (
          <div className="absolute inset-x-0 bottom-0 z-10 h-[3px] bg-white/20">
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

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-5 text-white">
              {item.name}
            </h3>

            <p className="mt-1 text-[11px] font-medium text-white/42">
              {getTypeLabel(item)}
            </p>
          </div>

          <span
            aria-hidden="true"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/[0.06] text-white/85"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
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

        {statusLabels.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {statusLabels.map(
              (status) => (
                <span
                  key={status}
                  className="rounded-full bg-[#d3203f]/14 px-2.5 py-1 text-[10px] font-medium text-[#f07a8f]"
                >
                  {status}
                </span>
              ),
            )}
          </div>
        ) : null}

        {metadata.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/56">
            {metadata.map(
              (value, index) => (
                <span
                  key={`${value}-${index}`}
                  className="inline-flex items-center gap-2"
                >
                  {index > 0 ? (
                    <span
                      aria-hidden="true"
                      className="h-0.5 w-0.5 rounded-full bg-white/30"
                    />
                  ) : null}

                  {value}
                </span>
              ),
            )}
          </div>
        ) : null}

        {genres ? (
          <p className="mt-3 truncate text-[11px] text-white/42">
            {genres}
          </p>
        ) : null}

        <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-white/72">
          <span>
            Details
          </span>

          <span
            aria-hidden="true"
          >
            →
          </span>
        </div>
      </div>
    </Link>,
    document.body,
  );
}