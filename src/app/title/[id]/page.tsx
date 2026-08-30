import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  AppHeader,
} from "@/components/layout/app-header";
import {
  MediaCard,
} from "@/components/media/media-card";
import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaDetailsData,
} from "@/lib/jellyfin/media";
import {
  formatProgress,
  formatRating,
  formatRuntime,
} from "@/lib/utils/media-format";
import {
  parseMediaItemId,
} from "@/lib/utils/media-query";
import type {
  MediaDetailsData,
} from "@/types/media";

type TitlePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic =
  "force-dynamic";

function getUpstreamStatus(
  error: unknown,
): number | null {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return null;
  }

  const response =
    Reflect.get(
      error,
      "response",
    );

  if (
    typeof response !== "object" ||
    response === null
  ) {
    return null;
  }

  const status =
    Reflect.get(
      response,
      "status",
    );

  return typeof status === "number"
    ? status
    : null;
}

function displayType(
  type: string,
): string {
  if (type === "BoxSet") {
    return "Collection";
  }

  return type;
}

export default async function TitlePage({
  params,
}: TitlePageProps) {
  const context =
    await getJellyfinContext();

  if (context.status === "anonymous") {
    redirect("/login");
  }

  if (context.status === "invalid") {
    redirect(
      "/api/auth/logout?reason=expired",
    );
  }

  const routeParams =
    await params;

  const itemId =
    parseMediaItemId(
      routeParams.id,
      "id",
    );

  if (!itemId.ok) {
    notFound();
  }

  let details: MediaDetailsData | null =
    null;

  try {
    details =
      await getMediaDetailsData(
        context,
        itemId.value,
      );
  } catch (error) {
    if (
      getUpstreamStatus(error) ===
      404
    ) {
      notFound();
    }

    console.warn(
      "Pazora title details query failed.",
    );
  }

  if (details === null) {
    return (
      <main className="min-h-screen bg-[#0b0b0d] text-white">
        <AppHeader
          userName={context.user.name}
          showMovies={false}
          showSeries={false}
          showCollections={false}
        />

        <section className="pazora-page-gutter flex min-h-screen items-center justify-center pt-20">
          <div className="max-w-md text-center">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#d3203f]">
              PAZORA
            </p>

            <h1 className="mt-4 text-2xl font-semibold">
              Unable to load title
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/45">
              Pazora could not retrieve
              this item from Jellyfin.
            </p>

            <Link
              href="/browse"
              prefetch={false}
              className="mt-6 inline-flex rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/85"
            >
              Back to Home
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const item =
    details.item;

  const backdrop =
    item.artwork.backdropUrl ??
    item.artwork.posterUrl;

  const runtime =
    formatRuntime(
      item.runtimeTicks,
    );

  const communityRating =
    formatRating(
      item.communityRating,
    );

  const progress =
    formatProgress(
      item.user.playedPercentage,
    );

  const tagline =
    details.metadata.taglines[0] ??
    null;

  const genres =
    item.genres.join(" • ");

  const studios =
    details.metadata.studios.join(
      " • ",
    );

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white">
      <AppHeader
        userName={context.user.name}
        showMovies={false}
        showSeries={false}
        showCollections={false}
      />

      <section className="relative min-h-[34rem] overflow-hidden pt-[var(--pazora-header-height)] sm:min-h-[40rem] lg:min-h-[44rem]">
        {backdrop ? (
          <div
            role="img"
            aria-label={`${item.name} backdrop`}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                `url("${backdrop}")`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(211,32,63,0.18),transparent_34%),linear-gradient(120deg,#18181d,#09090b_70%)]" />
        )}

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/75 to-black/10"
        />

        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[65%] bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/75 to-transparent"
        />

        <div className="pazora-page-gutter relative z-10 flex min-h-[34rem] items-end pb-16 pt-24 sm:min-h-[40rem] sm:pb-20 lg:min-h-[44rem]">
          <div className="max-w-[680px]">
            <Link
              href="/browse"
              prefetch={false}
              className="mb-8 inline-flex items-center gap-2 text-xs font-medium text-white/55 transition hover:text-white"
            >
              <span
                aria-hidden="true"
              >
                ←
              </span>

              Back to Home
            </Link>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              {displayType(
                item.type,
              )}
            </p>

            <h1 className="mt-3 max-w-[17ch] text-[clamp(2.5rem,5vw,4.7rem)] font-bold leading-[0.98] tracking-[-0.045em] text-white [text-shadow:0_5px_28px_rgba(0,0,0,0.5)]">
              {item.name}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/70">
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

              {communityRating ? (
                <span>
                  ★ {communityRating}
                </span>
              ) : null}

              {progress ? (
                <span className="text-[#ef6079]">
                  {progress}
                </span>
              ) : null}
            </div>

            {tagline ? (
              <p className="mt-5 text-sm font-medium italic text-white/55">
                {tagline}
              </p>
            ) : null}

            {item.overview ? (
              <p className="mt-5 max-w-[62ch] text-[15px] leading-7 text-white/70 sm:text-base">
                {item.overview}
              </p>
            ) : null}

            <div className="mt-6 space-y-2 text-sm leading-6 text-white/45">
              {genres ? (
                <p>
                  <span className="text-white/70">
                    Genres:
                  </span>{" "}
                  {genres}
                </p>
              ) : null}

              {studios ? (
                <p>
                  <span className="text-white/70">
                    Studios:
                  </span>{" "}
                  {studios}
                </p>
              ) : null}

              {item.seriesName ? (
                <p>
                  <span className="text-white/70">
                    Series:
                  </span>{" "}
                  {item.seriesName}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 -mt-4 pb-24">
        {details.collectionItems.items
          .length > 0 ? (
          <section className="mb-14">
            <div className="pazora-page-gutter mb-4">
              <h2 className="text-xl font-semibold tracking-tight">
                In this collection
              </h2>
            </div>

            <div className="pazora-scrollbar-hidden flex gap-4 overflow-x-auto px-[var(--pazora-page-gutter)] pb-5">
              {details.collectionItems.items.map(
                (child) => (
                  <MediaCard
                    key={child.id}
                    item={child}
                    variant="poster"
                  />
                ),
              )}
            </div>
          </section>
        ) : null}

        {details.seasons.items.length >
        0 ? (
          <section className="pazora-page-gutter">
            <h2 className="text-xl font-semibold tracking-tight">
              Seasons
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {details.seasons.items.map(
                (season) => (
                  <article
                    key={season.id}
                    className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-4 py-4"
                  >
                    <p className="text-sm font-medium text-white">
                      {season.name}
                    </p>

                    {season.productionYear ? (
                      <p className="mt-1 text-xs text-white/35">
                        {
                          season.productionYear
                        }
                      </p>
                    ) : null}
                  </article>
                ),
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}