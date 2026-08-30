import type {
  MediaBrowseKind,
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

const browseKinds: readonly MediaBrowseKind[] = [
  "movie",
  "series",
  "collection",
];

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