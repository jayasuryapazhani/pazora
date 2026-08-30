import type {
  MediaItem,
} from "@/types/media";
import {
  formatRating,
  formatRuntime,
} from "@/lib/utils/media-format";

type HomeHeroProps = {
  item: MediaItem | null;
  primaryTarget: string | null;
  browseTarget: string | null;
};

export function HomeHero({
  item,
  primaryTarget,
  browseTarget,
}: HomeHeroProps) {
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

  const backdrop =
    item?.artwork.backdropUrl ??
    item?.artwork.posterUrl ??
    null;

  const primaryLabel =
    primaryTarget ===
    "#continue-watching"
      ? "Continue watching"
      : "Explore";

  return (
    <section
      id="top"
      className="pazora-hero-enter relative h-[78vh] min-h-[640px] max-h-[850px] overflow-hidden"
    >
      {backdrop ? (
        <div
          role="img"
          aria-label={`${item?.name ?? "Featured"} backdrop`}
          className="absolute inset-0 scale-[1.01] bg-cover bg-center"
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
        className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/65 to-transparent"
      />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/50 to-transparent"
      />

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/70 to-transparent"
      />

      <div className="pazora-page-gutter relative z-10 flex h-full items-end pb-36 sm:pb-40 lg:pb-44">
        <div className="pazora-content-enter max-w-[610px]">
          {item ? (
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-white/48">
                Featured on Pazora
              </p>

              <h1 className="max-w-[15ch] text-[clamp(2.6rem,5vw,4.6rem)] font-bold leading-[0.98] tracking-[-0.045em] text-white [text-shadow:0_4px_24px_rgba(0,0,0,0.48)]">
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

              {item.overview ? (
                <p className="mt-5 line-clamp-3 max-w-[56ch] text-[15px] leading-6 text-white/68 sm:text-base sm:leading-7">
                  {item.overview}
                </p>
              ) : null}

              {primaryTarget ||
              browseTarget ? (
                <div className="mt-7 flex flex-wrap gap-3">
                  {primaryTarget ? (
                    <a
                      href={
                        primaryTarget
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-black/20 transition duration-200 hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {primaryLabel}
                    </a>
                  ) : null}

                  {browseTarget ? (
                    <a
                      href={
                        browseTarget
                      }
                      className="inline-flex min-h-11 items-center justify-center rounded-md bg-white/16 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-md transition duration-200 hover:bg-white/24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      Browse library
                    </a>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#d3203f]">
                PAZORA
              </p>

              <h1 className="mt-4 text-[clamp(2.7rem,5vw,4.8rem)] font-bold leading-none tracking-[-0.045em] text-white">
                Your private library.
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-white/55">
                Movies, shows,
                collections and family
                media in one place.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}