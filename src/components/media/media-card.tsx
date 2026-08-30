import Link from "next/link";

import type {
  MediaItem,
} from "@/types/media";
import {
  formatProgress,
  formatRuntime,
} from "@/lib/utils/media-format";

type MediaCardProps = {
  item: MediaItem;
  variant: "poster" | "landscape";
};

function getArtwork(
  item: MediaItem,
  variant: MediaCardProps["variant"],
) {
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

export function MediaCard({
  item,
  variant,
}: MediaCardProps) {
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

  return (
    <Link
      href={`/title/${item.id}`}
      prefetch={false}
      aria-label={`Open ${item.name}`}
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
            "relative isolate overflow-hidden bg-[#1a1a1e] shadow-[0_12px_32px_rgba(0,0,0,0.22)] transition duration-250 ease-out group-hover:-translate-y-1 group-hover:scale-[1.025] group-hover:shadow-[0_24px_55px_rgba(0,0,0,0.46)] group-focus-visible:-translate-y-1 group-focus-visible:scale-[1.025]",
            isLandscape
              ? "aspect-video rounded-md"
              : "aspect-[2/3] rounded-md",
          ].join(" ")}
        >
          {artwork ? (
            <div
              role="img"
              aria-label={`${item.name} artwork`}
              className="absolute inset-0 bg-cover bg-center transition duration-500 ease-out group-hover:scale-[1.035]"
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
            className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/0 to-transparent opacity-0 transition duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
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
  );
}