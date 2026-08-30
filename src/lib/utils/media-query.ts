import type {
  MediaBrowseKind,
  MediaBrowseOptions,
  MediaBrowseSort,
  MediaWatchFilter,
} from "@/types/media";

export type MediaPagination = {
  startIndex: number;
  limit: number;
};

export type MediaQueryResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: string;
    };

const defaultMediaPageSize = 24;
const maximumMediaPageSize = 60;
const maximumSearchLength = 120;
const maximumGenreLength = 80;

const browseKinds: readonly MediaBrowseKind[] = [
  "movie",
  "series",
  "collection",
];

const browseSorts: readonly MediaBrowseSort[] = [
  "title-asc",
  "title-desc",
  "recently-added",
  "release-newest",
  "release-oldest",
  "rating-highest",
  "runtime-longest",
  "runtime-shortest",
];

const watchFilters: readonly MediaWatchFilter[] = [
  "all",
  "watched",
  "unwatched",
  "in-progress",
];

export const defaultMediaBrowseOptions: MediaBrowseOptions = {
  genre: null,
  year: null,
  watch: "all",
  favoriteOnly: false,
  sort: "title-asc",
};

function parseUnsignedInteger(
  rawValue: string | null,
  name: string,
  defaultValue: number,
  minimum: number,
  maximum: number | null,
): MediaQueryResult<number> {
  if (
    rawValue === null ||
    rawValue === ""
  ) {
    return {
      ok: true,
      value: defaultValue,
    };
  }

  if (!/^\d+$/.test(rawValue)) {
    return {
      ok: false,
      error:
        `${name} must be a whole number.`,
    };
  }

  const value =
    Number(rawValue);

  if (!Number.isSafeInteger(value)) {
    return {
      ok: false,
      error:
        `${name} is outside the supported range.`,
    };
  }

  if (value < minimum) {
    return {
      ok: false,
      error:
        `${name} must be at least ${minimum}.`,
    };
  }

  if (
    maximum !== null &&
    value > maximum
  ) {
    return {
      ok: false,
      error:
        `${name} must not exceed ${maximum}.`,
    };
  }

  return {
    ok: true,
    value,
  };
}

export function parseMediaPagination(
  searchParams: URLSearchParams,
): MediaQueryResult<MediaPagination> {
  const startIndex =
    parseUnsignedInteger(
      searchParams.get("startIndex"),
      "startIndex",
      0,
      0,
      null,
    );

  if (!startIndex.ok) {
    return startIndex;
  }

  const limit =
    parseUnsignedInteger(
      searchParams.get("limit"),
      "limit",
      defaultMediaPageSize,
      1,
      maximumMediaPageSize,
    );

  if (!limit.ok) {
    return limit;
  }

  return {
    ok: true,
    value: {
      startIndex:
        startIndex.value,
      limit:
        limit.value,
    },
  };
}

export function parseMediaBrowseKind(
  rawKind: string | null,
): MediaQueryResult<MediaBrowseKind> {
  if (!rawKind) {
    return {
      ok: false,
      error:
        "kind is required.",
    };
  }

  const kind =
    rawKind.trim();

  if (
    !browseKinds.includes(
      kind as MediaBrowseKind,
    )
  ) {
    return {
      ok: false,
      error:
        "kind must be movie, series, or collection.",
    };
  }

  return {
    ok: true,
    value:
      kind as MediaBrowseKind,
  };
}

function parseGenre(
  rawGenre: string | null,
): MediaQueryResult<string | null> {
  const genre =
    rawGenre?.trim() ?? "";

  if (!genre) {
    return {
      ok: true,
      value: null,
    };
  }

  if (
    genre.length >
    maximumGenreLength
  ) {
    return {
      ok: false,
      error:
        `genre must not exceed ${maximumGenreLength} characters.`,
    };
  }

  return {
    ok: true,
    value: genre,
  };
}

function parseYear(
  rawYear: string | null,
): MediaQueryResult<number | null> {
  if (
    rawYear === null ||
    rawYear === ""
  ) {
    return {
      ok: true,
      value: null,
    };
  }

  const maximumYear =
    new Date().getFullYear() + 5;

  const year =
    parseUnsignedInteger(
      rawYear,
      "year",
      0,
      1888,
      maximumYear,
    );

  if (!year.ok) {
    return year;
  }

  return {
    ok: true,
    value: year.value,
  };
}

function parseWatchFilter(
  rawWatch: string | null,
): MediaQueryResult<MediaWatchFilter> {
  const watch =
    rawWatch?.trim() || "all";

  if (
    !watchFilters.includes(
      watch as MediaWatchFilter,
    )
  ) {
    return {
      ok: false,
      error:
        "watch must be all, watched, unwatched, or in-progress.",
    };
  }

  return {
    ok: true,
    value:
      watch as MediaWatchFilter,
  };
}

function parseFavoriteOnly(
  rawFavorite: string | null,
): MediaQueryResult<boolean> {
  if (
    rawFavorite === null ||
    rawFavorite === "" ||
    rawFavorite === "0" ||
    rawFavorite === "false"
  ) {
    return {
      ok: true,
      value: false,
    };
  }

  if (
    rawFavorite === "1" ||
    rawFavorite === "true"
  ) {
    return {
      ok: true,
      value: true,
    };
  }

  return {
    ok: false,
    error:
      "favorite must be true, false, 1, or 0.",
  };
}

function parseBrowseSort(
  rawSort: string | null,
): MediaQueryResult<MediaBrowseSort> {
  const sort =
    rawSort?.trim() ||
    defaultMediaBrowseOptions.sort;

  if (
    !browseSorts.includes(
      sort as MediaBrowseSort,
    )
  ) {
    return {
      ok: false,
      error:
        "sort is not supported.",
    };
  }

  return {
    ok: true,
    value:
      sort as MediaBrowseSort,
  };
}

export function parseMediaBrowseOptions(
  searchParams: URLSearchParams,
): MediaQueryResult<MediaBrowseOptions> {
  const genre =
    parseGenre(
      searchParams.get("genre"),
    );

  if (!genre.ok) {
    return genre;
  }

  const year =
    parseYear(
      searchParams.get("year"),
    );

  if (!year.ok) {
    return year;
  }

  const watch =
    parseWatchFilter(
      searchParams.get("watch"),
    );

  if (!watch.ok) {
    return watch;
  }

  const favoriteOnly =
    parseFavoriteOnly(
      searchParams.get("favorite"),
    );

  if (!favoriteOnly.ok) {
    return favoriteOnly;
  }

  const sort =
    parseBrowseSort(
      searchParams.get("sort"),
    );

  if (!sort.ok) {
    return sort;
  }

  return {
    ok: true,
    value: {
      genre: genre.value,
      year: year.value,
      watch: watch.value,
      favoriteOnly:
        favoriteOnly.value,
      sort: sort.value,
    },
  };
}

export function parseMediaSearchTerm(
  rawQuery: string | null,
): MediaQueryResult<string> {
  const query =
    rawQuery?.trim() ?? "";

  if (!query) {
    return {
      ok: false,
      error:
        "q is required.",
    };
  }

  if (query.length > maximumSearchLength) {
    return {
      ok: false,
      error:
        `q must not exceed ${maximumSearchLength} characters.`,
    };
  }

  return {
    ok: true,
    value: query,
  };
}

const jellyfinItemIdPattern =
  /^[0-9a-fA-F-]+$/;

export function parseMediaItemId(
  rawId: string | null,
  name = "id",
): MediaQueryResult<string> {
  const id =
    rawId?.trim() ?? "";

  if (!id) {
    return {
      ok: false,
      error:
        `${name} is required.`,
    };
  }

  if (
    id.length > 64 ||
    !jellyfinItemIdPattern.test(id)
  ) {
    return {
      ok: false,
      error:
        `${name} is invalid.`,
    };
  }

  return {
    ok: true,
    value: id,
  };
}