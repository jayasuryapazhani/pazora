export type MediaUserState = {
  played: boolean;
  favorite: boolean;
  playbackPositionTicks: number;
  playedPercentage: number | null;
};

export type MediaImages = {
  primaryTag: string | null;
  backdropTags: string[];
  seriesPrimaryTag: string | null;
  parentBackdropItemId: string | null;
  parentBackdropTags: string[];
};

export type MediaArtwork = {
  posterUrl: string | null;
  backdropUrl: string | null;
};
export type MediaItem = {
  id: string;
  name: string;
  type: string;
  productionYear: number | null;
  overview: string | null;
  officialRating: string | null;
  communityRating: number | null;
  runtimeTicks: number | null;
  dateCreated: string | null;
  genres: string[];
  seriesId: string | null;
  seriesName: string | null;
  seasonId: string | null;
  seasonName: string | null;
  indexNumber: number | null;
  parentIndexNumber: number | null;
  images: MediaImages;
  artwork: MediaArtwork;
  user: MediaUserState;
};

export type MediaLibrary = {
  id: string;
  name: string;
  type: string;
  collectionType: string | null;
};

export type MediaShelf = {
  items: MediaItem[];
  total: number;
};

export type MediaBrowseKind =
  | "movie"
  | "series"
  | "collection";

export type MediaPage = {
  items: MediaItem[];
  total: number;
  startIndex: number;
  limit: number;
  hasMore: boolean;
  nextStartIndex: number | null;
};

export type MediaBrowseData = {
  kind: MediaBrowseKind;
  page: MediaPage;
};

export type MediaSearchData = {
  query: string;
  page: MediaPage;
};
export type MediaHomeData = {
  libraries: MediaLibrary[];
  continueWatching: MediaShelf;
  recentlyAdded: MediaShelf;
  movies: MediaShelf;
  series: MediaShelf;
  collections: MediaShelf;
};