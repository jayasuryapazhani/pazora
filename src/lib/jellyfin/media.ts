import {
  getItemsApi,
  getUserViewsApi,
} from "@jellyfin/sdk/lib/utils/api/index.js";
import {
  BaseItemKind,
  ItemFields,
  ItemSortBy,
  SortOrder,
  type BaseItemDto,
  type BaseItemDtoQueryResult,
} from "@jellyfin/sdk/lib/generated-client/models/index.js";

import type {
  AuthenticatedJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaArtwork,
} from "@/lib/jellyfin/artwork";
import {
  createAuthenticatedJellyfinApi,
} from "@/lib/jellyfin/server";
import type {
  MediaBrowseData,
  MediaBrowseKind,
  MediaHomeData,
  MediaItem,
  MediaLibrary,
  MediaPage,
  MediaSearchData,
  MediaShelf,
} from "@/types/media";

const mediaFields = [
  ItemFields.DateCreated,
  ItemFields.Genres,
  ItemFields.Overview,
  ItemFields.ParentId,
  ItemFields.PrimaryImageAspectRatio,
] as const;

function normalizeMediaItem(
  item: BaseItemDto,
): MediaItem | null {
  const id = item.Id;
  const name = item.Name?.trim();

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    type: item.Type ?? "Unknown",
    productionYear:
      item.ProductionYear ?? null,
    overview:
      item.Overview ?? null,
    officialRating:
      item.OfficialRating ?? null,
    communityRating:
      item.CommunityRating ?? null,
    runtimeTicks:
      item.RunTimeTicks ?? null,
    dateCreated:
      item.DateCreated ?? null,
    genres:
      item.Genres ?? [],
    seriesId:
      item.SeriesId ?? null,
    seriesName:
      item.SeriesName ?? null,
    seasonId:
      item.SeasonId ?? null,
    seasonName:
      item.SeasonName ?? null,
    indexNumber:
      item.IndexNumber ?? null,
    parentIndexNumber:
      item.ParentIndexNumber ?? null,
    images: {
      primaryTag:
        item.ImageTags?.Primary ?? null,
      backdropTags:
        item.BackdropImageTags ?? [],
      seriesPrimaryTag:
        item.SeriesPrimaryImageTag ?? null,
      parentBackdropItemId:
        item.ParentBackdropItemId ?? null,
      parentBackdropTags:
        item.ParentBackdropImageTags ?? [],
    },
    artwork:
      getMediaArtwork(item),
    user: {
      played:
        item.UserData?.Played ?? false,
      favorite:
        item.UserData?.IsFavorite ?? false,
      playbackPositionTicks:
        item.UserData?.PlaybackPositionTicks ?? 0,
      playedPercentage:
        item.UserData?.PlayedPercentage ?? null,
    },
  };
}

function normalizeShelf(
  result: BaseItemDtoQueryResult,
): MediaShelf {
  const items =
    (result.Items ?? [])
      .map(normalizeMediaItem)
      .filter(
        (
          item,
        ): item is MediaItem =>
          item !== null,
      );

  return {
    items,
    total:
      result.TotalRecordCount ??
      items.length,
  };
}

function assertShelfTypes(
  shelfName: string,
  shelf: MediaShelf,
  allowedTypes: readonly string[],
): MediaShelf {
  const unexpected =
    shelf.items.filter(
      (item) =>
        !allowedTypes.includes(item.type),
    );

  if (unexpected.length > 0) {
    const types =
      [
        ...new Set(
          unexpected.map(
            (item) => item.type,
          ),
        ),
      ].join(", ");

    throw new Error(
      `${shelfName} returned unexpected item type(s): ${types}`,
    );
  }

  return shelf;
}

function normalizeLibraries(
  result: BaseItemDtoQueryResult,
): MediaLibrary[] {
  const libraries: MediaLibrary[] = [];

  for (const item of result.Items ?? []) {
    if (!item.Id || !item.Name) {
      continue;
    }

    libraries.push({
      id: item.Id,
      name: item.Name,
      type:
        item.Type ?? "Unknown",
      collectionType:
        item.CollectionType ?? null,
    });
  }

  return libraries;
}

export async function getMediaHomeData(
  context: AuthenticatedJellyfinContext,
): Promise<MediaHomeData> {
  const api =
    createAuthenticatedJellyfinApi(
      context.accessToken,
      context.deviceId,
    );

  const itemsApi =
    getItemsApi(api);

  const userViewsApi =
    getUserViewsApi(api);

  const [
    librariesResponse,
    continueWatchingResponse,
    recentlyAddedResponse,
    moviesResponse,
    seriesResponse,
    collectionsResponse,
  ] = await Promise.all([
    userViewsApi.getUserViews({
      userId: context.user.id,
      includeExternalContent: false,
      includeHidden: false,
    }),

    itemsApi.getResumeItems({
      userId: context.user.id,
      limit: 20,
      fields: [...mediaFields],
      includeItemTypes: [
        BaseItemKind.Movie,
        BaseItemKind.Episode,
      ],
      enableUserData: true,
      enableImages: true,
      imageTypeLimit: 2,
      enableTotalRecordCount: true,
    }),

    itemsApi.getItems({
      userId: context.user.id,
      recursive: true,
      limit: 24,
      includeItemTypes: [
        BaseItemKind.Movie,
        BaseItemKind.Episode,
      ],
      collapseBoxSetItems: false,
      fields: [...mediaFields],
      sortBy: [
        ItemSortBy.DateCreated,
      ],
      sortOrder: [
        SortOrder.Descending,
      ],
      enableUserData: true,
      enableImages: true,
      imageTypeLimit: 2,
      enableTotalRecordCount: true,
    }),

    itemsApi.getItems({
      userId: context.user.id,
      recursive: true,
      limit: 60,
      includeItemTypes: [
        BaseItemKind.Movie,
      ],
      collapseBoxSetItems: false,
      fields: [...mediaFields],
      sortBy: [
        ItemSortBy.SortName,
      ],
      sortOrder: [
        SortOrder.Ascending,
      ],
      enableUserData: true,
      enableImages: true,
      imageTypeLimit: 2,
      enableTotalRecordCount: true,
    }),

    itemsApi.getItems({
      userId: context.user.id,
      recursive: true,
      limit: 60,
      includeItemTypes: [
        BaseItemKind.Series,
      ],
      collapseBoxSetItems: false,
      fields: [...mediaFields],
      sortBy: [
        ItemSortBy.SortName,
      ],
      sortOrder: [
        SortOrder.Ascending,
      ],
      enableUserData: true,
      enableImages: true,
      imageTypeLimit: 2,
      enableTotalRecordCount: true,
    }),

    itemsApi.getItems({
      userId: context.user.id,
      recursive: true,
      limit: 60,
      includeItemTypes: [
        BaseItemKind.BoxSet,
      ],
      fields: [...mediaFields],
      sortBy: [
        ItemSortBy.SortName,
      ],
      sortOrder: [
        SortOrder.Ascending,
      ],
      enableUserData: true,
      enableImages: true,
      imageTypeLimit: 2,
      enableTotalRecordCount: true,
    }),
  ]);

  return {
    libraries:
      normalizeLibraries(
        librariesResponse.data,
      ),

    continueWatching:
      assertShelfTypes(
        "Continue Watching",
        normalizeShelf(
          continueWatchingResponse.data,
        ),
        [
          BaseItemKind.Movie,
          BaseItemKind.Episode,
        ],
      ),

    recentlyAdded:
      assertShelfTypes(
        "Recently Added",
        normalizeShelf(
          recentlyAddedResponse.data,
        ),
        [
          BaseItemKind.Movie,
          BaseItemKind.Episode,
        ],
      ),

    movies:
      assertShelfTypes(
        "Movies",
        normalizeShelf(
          moviesResponse.data,
        ),
        [
          BaseItemKind.Movie,
        ],
      ),

    series:
      assertShelfTypes(
        "Series",
        normalizeShelf(
          seriesResponse.data,
        ),
        [
          BaseItemKind.Series,
        ],
      ),

    collections:
      assertShelfTypes(
        "Collections",
        normalizeShelf(
          collectionsResponse.data,
        ),
        [
          BaseItemKind.BoxSet,
        ],
      ),
  };
}
function normalizeMediaPage(
  result: BaseItemDtoQueryResult,
  startIndex: number,
  limit: number,
): MediaPage {
  const shelf =
    normalizeShelf(result);

  const returnedCount =
    result.Items?.length ?? 0;

  const total =
    result.TotalRecordCount ??
    startIndex + returnedCount;

  const candidateNextIndex =
    startIndex + returnedCount;

  const hasMore =
    returnedCount > 0 &&
    candidateNextIndex < total;

  return {
    items: shelf.items,
    total,
    startIndex,
    limit,
    hasMore,
    nextStartIndex:
      hasMore
        ? candidateNextIndex
        : null,
  };
}

const browseItemTypes: Record<
  MediaBrowseKind,
  readonly BaseItemKind[]
> = {
  movie: [
    BaseItemKind.Movie,
  ],
  series: [
    BaseItemKind.Series,
  ],
  collection: [
    BaseItemKind.BoxSet,
  ],
};

export async function getMediaBrowseData(
  context: AuthenticatedJellyfinContext,
  kind: MediaBrowseKind,
  startIndex: number,
  limit: number,
): Promise<MediaBrowseData> {
  const api =
    createAuthenticatedJellyfinApi(
      context.accessToken,
      context.deviceId,
    );

  const itemTypes =
    browseItemTypes[kind];

  const response =
    await getItemsApi(api).getItems({
      userId: context.user.id,
      recursive: true,
      startIndex,
      limit,
      includeItemTypes: [
        ...itemTypes,
      ],
      collapseBoxSetItems: false,
      fields: [...mediaFields],
      sortBy: [
        ItemSortBy.SortName,
      ],
      sortOrder: [
        SortOrder.Ascending,
      ],
      enableUserData: true,
      enableImages: true,
      imageTypeLimit: 2,
      enableTotalRecordCount: true,
    });

  const page =
    normalizeMediaPage(
      response.data,
      startIndex,
      limit,
    );

  assertShelfTypes(
    "Media browse",
    page,
    itemTypes,
  );

  return {
    kind,
    page,
  };
}

const searchItemTypes = [
  BaseItemKind.Movie,
  BaseItemKind.Series,
  BaseItemKind.Episode,
  BaseItemKind.BoxSet,
] as const;

export async function getMediaSearchData(
  context: AuthenticatedJellyfinContext,
  query: string,
  startIndex: number,
  limit: number,
): Promise<MediaSearchData> {
  const api =
    createAuthenticatedJellyfinApi(
      context.accessToken,
      context.deviceId,
    );

  const response =
    await getItemsApi(api).getItems({
      userId: context.user.id,
      recursive: true,
      searchTerm: query,
      startIndex,
      limit,
      includeItemTypes: [
        ...searchItemTypes,
      ],
      collapseBoxSetItems: false,
      fields: [...mediaFields],
      sortBy: [
        ItemSortBy.SortName,
      ],
      sortOrder: [
        SortOrder.Ascending,
      ],
      enableUserData: true,
      enableImages: true,
      imageTypeLimit: 2,
      enableTotalRecordCount: true,
    });

  const page =
    normalizeMediaPage(
      response.data,
      startIndex,
      limit,
    );

  assertShelfTypes(
    "Media search",
    page,
    searchItemTypes,
  );

  return {
    query,
    page,
  };
}
