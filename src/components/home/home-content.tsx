import {
  HomeHero,
} from "@/components/home/home-hero";
import type {
  HomeHeroSlide,
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

type BrowseTarget = {
  target: string;
  label: string;
};

const maximumHeroSlides = 8;

function canUseAsHero(
  item: MediaItem,
): boolean {
  return (
    item.type === "Movie" &&
    (
      item.artwork.backdropUrl !== null ||
      item.artwork.posterUrl !== null
    )
  );
}

function buildHeroSlides(
  media: MediaHomeData,
): HomeHeroSlide[] {
  const candidates: HomeHeroSlide[] = [
    ...media.continueWatching.items
      .filter(canUseAsHero)
      .map(
        (item) => ({
          item,
          sourceLabel:
            "Continue Watching",
        }),
      ),

    ...media.recentlyAdded.items
      .filter(canUseAsHero)
      .map(
        (item) => ({
          item,
          sourceLabel:
            "Recently Added",
        }),
      ),

    ...media.movies.items
      .filter(canUseAsHero)
      .map(
        (item) => ({
          item,
          sourceLabel:
            "Featured Movie",
        }),
      ),
  ];

  const seen =
    new Set<string>();

  const slides: HomeHeroSlide[] =
    [];

  for (const candidate of candidates) {
    if (
      seen.has(candidate.item.id)
    ) {
      continue;
    }

    seen.add(
      candidate.item.id,
    );

    slides.push(candidate);

    if (
      slides.length >=
      maximumHeroSlides
    ) {
      break;
    }
  }

  return slides;
}

function findBrowseTarget(
  media: MediaHomeData,
): BrowseTarget | null {
  if (media.movies.items.length > 0) {
    return {
      target: "#movies",
      label: "Browse Movies",
    };
  }

  if (media.series.items.length > 0) {
    return {
      target: "#tv-shows",
      label: "Browse TV Shows",
    };
  }

  if (
    media.collections.items.length > 0
  ) {
    return {
      target: "#collections",
      label:
        "Browse Collections",
    };
  }

  if (
    media.recentlyAdded.items.length > 0
  ) {
    return {
      target:
        "#recently-added",
      label:
        "Browse Recently Added",
    };
  }

  return null;
}

export function HomeContent({
  media,
}: HomeContentProps) {
  const heroSlides =
    buildHeroSlides(media);

  const browse =
    findBrowseTarget(media);

  return (
    <>
      <HomeHero
        slides={heroSlides}
        browseTarget={
          browse?.target ?? null
        }
        browseLabel={
          browse?.label ?? null
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
          items={
            media.movies.items
          }
        />

        <MediaRow
          id="tv-shows"
          title="TV Shows"
          items={
            media.series.items
          }
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