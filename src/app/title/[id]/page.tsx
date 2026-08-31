import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import {
  AppHeader,
} from "@/components/layout/app-header";
import {
  MediaRow,
} from "@/components/media/media-row";
import {
  MediaProgress,
} from "@/components/media/media-progress";
import {
  SeriesSeasons,
} from "@/components/tv/series-seasons";
import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaDetailsData,
  getMediaEpisodesData,
} from "@/lib/jellyfin/media";
import {
  formatRating,
  formatRuntime,
} from "@/lib/utils/media-format";
import {
  parseMediaItemId,
} from "@/lib/utils/media-query";
import type {
  MediaDetailsData,
  MediaEpisodesData,
} from "@/types/media";

type TitlePageProps = {
  params: Promise<{
    id: string;
  }>;
};

type Fact = {
  label: string;
  value: string;
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

function titleSizeClass(
  title: string,
): string {
  if (title.length >= 46) {
    return (
      "text-[clamp(2.2rem,4.2vw,4.2rem)]"
    );
  }

  if (title.length >= 30) {
    return (
      "text-[clamp(2.45rem,4.7vw,4.6rem)]"
    );
  }

  return (
    "text-[clamp(2.7rem,5vw,4.9rem)]"
  );
}

function formatPremiereDate(
  value: string | null,
): string | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    },
  ).format(date);
}

function buildFacts(
  details: MediaDetailsData,
): Fact[] {
  const item =
    details.item;

  const facts: Fact[] = [];

  const originalTitle =
    details.metadata.originalTitle;

  if (
    originalTitle &&
    originalTitle !== item.name
  ) {
    facts.push({
      label: "Original title",
      value: originalTitle,
    });
  }

  const premiere =
    formatPremiereDate(
      details.metadata.premiereDate,
    );

  if (premiere) {
    facts.push({
      label: "Premiere",
      value: premiere,
    });
  }

  const community =
    formatRating(
      item.communityRating,
    );

  if (community) {
    facts.push({
      label:
        "Community rating",
      value: `${community} / 10`,
    });
  }

  if (
    details.metadata.criticRating !==
    null
  ) {
    facts.push({
      label: "Critic rating",
      value:
        `${details.metadata.criticRating}`,
    });
  }

  if (
    details.metadata.childCount !==
    null &&
    details.metadata.childCount > 0
  ) {
    facts.push({
      label: "Titles",
      value:
        `${details.metadata.childCount}`,
    });
  }

  if (item.user.favorite) {
    facts.push({
      label: "Library status",
      value: "Favorite",
    });
  } else if (item.user.played) {
    facts.push({
      label: "Watch status",
      value: "Watched",
    });
  } else if (
    item.user.playedPercentage !==
      null &&
    item.user.playedPercentage > 0
  ) {
    facts.push({
      label: "Watch status",
      value: "In progress",
    });
  }

  return facts;
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

  const tagline =
    details.metadata.taglines[0] ??
    null;

  const genres =
    item.genres.join(" \u2022 ");

  const studios =
    details.metadata.studios.join(
      " \u2022 ",
    );

  const facts =
    buildFacts(details);

  let initialEpisodes:
    | MediaEpisodesData
    | null = null;

  if (
    item.type === "Series" &&
    details.seasons.items.length > 0
  ) {
    const firstSeason =
      details.seasons.items[0];

    try {
      initialEpisodes =
        await getMediaEpisodesData(
          context,
          item.id,
          firstSeason.id,
        );
    } catch {
      console.warn(
        "Pazora initial Series episodes query failed.",
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white">
      <AppHeader
        userName={context.user.name}
      />

      <section className="relative min-h-[35rem] overflow-hidden pt-[var(--pazora-header-height)] sm:min-h-[40rem] lg:min-h-[44rem]">
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
          className="absolute inset-0 bg-gradient-to-r from-[#09090b] via-[#09090b]/77 to-black/10"
        />

        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-[#0b0b0d] via-[#0b0b0d]/78 to-transparent"
        />

        <div className="pazora-page-gutter relative z-10 flex min-h-[35rem] items-end pb-16 pt-24 sm:min-h-[40rem] sm:pb-20 lg:min-h-[44rem]">
          <div className="max-w-[700px]">
            <Link
              href="/browse"
              prefetch={false}
              className="mb-8 inline-flex items-center gap-2 text-xs font-medium text-white/55 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span
                aria-hidden="true"
              >{"\u2190"}</span>

              Back to Home
            </Link>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              {displayType(
                item.type,
              )}
            </p>

            <h1
              className={[
                "mt-3 max-w-[18ch] text-balance font-bold leading-[0.98] tracking-[-0.045em] text-white [text-shadow:0_5px_28px_rgba(0,0,0,0.5)]",
                titleSizeClass(
                  item.name,
                ),
              ].join(" ")}
            >
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
                <span>{"\u2605"} {communityRating}</span>
              ) : null}
            </div>

            <div className="mt-4">
              <MediaProgress
                percentage={
                  item.user
                    .playedPercentage
                }
              />
            </div>

            {item.type === "Movie" ||
            item.type === "Episode" ? (
              <div className="mt-6">
                <Link
                  href={`/watch/${item.id}`}
                  prefetch={false}
                  className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                >
                  <span aria-hidden="true">
                    {"\u25B6"}
                  </span>

                  {item.user
                    .playbackPositionTicks >
                  0
                    ? "Resume"
                    : "Play"}
                </Link>
              </div>
            ) : null}

            {tagline ? (
              <p className="mt-5 text-sm font-medium italic leading-6 text-white/55">
                {tagline}
              </p>
            ) : null}

            {item.overview ? (
              <p className="mt-5 max-w-[62ch] text-[15px] leading-7 text-white/72 sm:text-base">
                {item.overview}
              </p>
            ) : null}

            {genres ? (
              <p className="mt-5 text-sm leading-6 text-white/48">
                <span className="text-white/72">
                  Genres:
                </span>{" "}
                {genres}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="relative z-10 pb-24">
        {facts.length > 0 ||
        studios ? (
          <section className="pazora-page-gutter border-t border-white/[0.06] py-10 sm:py-12">
            <h2 className="text-xl font-semibold tracking-tight text-white">
              About {item.name}
            </h2>

            {facts.length > 0 ? (
              <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-3">
                {facts.map(
                  (fact) => (
                    <div
                      key={fact.label}
                      className="min-w-0"
                    >
                      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/32">
                        {fact.label}
                      </dt>

                      <dd className="mt-1.5 break-words text-sm leading-6 text-white/72">
                        {fact.value}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            ) : null}

            {studios ? (
              <div className="mt-7 max-w-4xl border-t border-white/[0.05] pt-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/32">
                  Studios
                </p>

                <p className="mt-2 text-sm leading-6 text-white/52">
                  {studios}
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {details.collectionItems.items
          .length > 0 ? (
          <div className="mb-14 pt-2">
            <MediaRow
              id="collection-items"
              title="In this collection"
              items={
                details.collectionItems.items
              }
              variant="poster"
            />
          </div>
        ) : null}

        {item.type === "Series" &&
        details.seasons.items.length >
          0 ? (
          <SeriesSeasons
            seriesId={item.id}
            seasons={
              details.seasons.items
            }
            initialEpisodes={
              initialEpisodes
            }
          />
        ) : null}
      </div>
    </main>
  );
}