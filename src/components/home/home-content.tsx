import {
  HomeHero,
} from "@/components/home/home-hero";
import {
  MediaRow,
} from "@/components/media/media-row";
import type {
  MediaHomeData,
  MediaItem,
} from "@/types/media";

type HomeContentProps = {
  media: MediaHomeData;
};

type HeroSelection = {
  item: MediaItem;
  target: string;
};

function findHeroSelection(
  media: MediaHomeData,
): HeroSelection | null {
  const candidates: HeroSelection[] = [
    ...media.continueWatching.items.map(
      (item) => ({
        item,
        target:
          "#continue-watching",
      }),
    ),

    ...media.recentlyAdded.items.map(
      (item) => ({
        item,
        target:
          "#recently-added",
      }),
    ),

    ...media.movies.items.map(
      (item) => ({
        item,
        target: "#movies",
      }),
    ),

    ...media.series.items.map(
      (item) => ({
        item,
        target: "#tv-shows",
      }),
    ),

    ...media.collections.items.map(
      (item) => ({
        item,
        target:
          "#collections",
      }),
    ),
  ];

  return (
    candidates.find(
      ({ item }) =>
        item.artwork.backdropUrl !== null,
    ) ??
    candidates.find(
      ({ item }) =>
        item.artwork.posterUrl !== null,
    ) ??
    candidates[0] ??
    null
  );
}

function findLibraryTarget(
  media: MediaHomeData,
): string | null {
  if (media.movies.items.length > 0) {
    return "#movies";
  }

  if (media.series.items.length > 0) {
    return "#tv-shows";
  }

  if (
    media.collections.items.length > 0
  ) {
    return "#collections";
  }

  if (
    media.recentlyAdded.items.length > 0
  ) {
    return "#recently-added";
  }

  if (
    media.continueWatching.items.length >
    0
  ) {
    return "#continue-watching";
  }

  return null;
}

export function HomeContent({
  media,
}: HomeContentProps) {
  const hero =
    findHeroSelection(media);

  const libraryTarget =
    findLibraryTarget(media);

  const secondaryTarget =
    libraryTarget !== null &&
    libraryTarget !== hero?.target
      ? libraryTarget
      : null;

  return (
    <>
      <HomeHero
        item={hero?.item ?? null}
        primaryTarget={
          hero?.target ?? null
        }
        browseTarget={
          secondaryTarget
        }
      />

      <div className="relative z-20 -mt-24 space-y-8 pb-20 sm:-mt-28 sm:space-y-10 lg:-mt-32 lg:space-y-12">
        <MediaRow
          id="continue-watching"
          title="Continue Watching"
          items={
            media.continueWatching.items
          }
          variant="landscape"
        />

        <MediaRow
          id="recently-added"
          title="Recently Added"
          items={
            media.recentlyAdded.items
          }
        />

        <MediaRow
          id="movies"
          title="Movies"
          items={media.movies.items}
        />

        <MediaRow
          id="tv-shows"
          title="TV Shows"
          items={media.series.items}
        />

        <MediaRow
          id="collections"
          title="Collections"
          items={
            media.collections.items
          }
        />
      </div>
    </>
  );
}