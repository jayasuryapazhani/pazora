"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  MediaGrid,
} from "@/components/media/media-grid";
import {
  defaultMediaBrowseOptions,
} from "@/lib/utils/media-query";
import type {
  MediaBrowseData,
  MediaBrowseKind,
  MediaBrowseOptions,
  MediaBrowseSort,
  MediaItem,
  MediaPage,
  MediaWatchFilter,
} from "@/types/media";

type MediaLibraryBrowserProps = {
  title: string;
  description: string;
  initialData: MediaBrowseData;
};

type BrowseApiResponse =
  | {
      authenticated: true;
      media: MediaBrowseData;
    }
  | {
      authenticated: false;
    }
  | {
      error: string;
    };

const pageSize = 36;

const movieSortOptions: ReadonlyArray<{
  value: MediaBrowseSort;
  label: string;
}> = [
  {
    value: "title-asc",
    label: "Title: A-Z",
  },
  {
    value: "title-desc",
    label: "Title: Z-A",
  },
  {
    value: "recently-added",
    label: "Recently added",
  },
  {
    value: "release-newest",
    label: "Newest release",
  },
  {
    value: "release-oldest",
    label: "Oldest release",
  },
  {
    value: "rating-highest",
    label: "Highest rated",
  },
  {
    value: "runtime-longest",
    label: "Longest runtime",
  },
  {
    value: "runtime-shortest",
    label: "Shortest runtime",
  },
];

const collectionSortOptions: ReadonlyArray<{
  value: MediaBrowseSort;
  label: string;
}> = [
  {
    value: "title-asc",
    label: "Title: A-Z",
  },
  {
    value: "title-desc",
    label: "Title: Z-A",
  },
  {
    value: "recently-added",
    label: "Recently added",
  },
];

const watchOptions: ReadonlyArray<{
  value: MediaWatchFilter;
  label: string;
}> = [
  {
    value: "all",
    label: "All watch states",
  },
  {
    value: "in-progress",
    label: "In progress",
  },
  {
    value: "unwatched",
    label: "Unwatched",
  },
  {
    value: "watched",
    label: "Watched",
  },
];

function mergeItems(
  current: MediaItem[],
  incoming: MediaItem[],
): MediaItem[] {
  const seen =
    new Set(
      current.map(
        (item) => item.id,
      ),
    );

  const merged =
    [...current];

  for (const item of incoming) {
    if (seen.has(item.id)) {
      continue;
    }

    seen.add(item.id);
    merged.push(item);
  }

  return merged;
}

function buildBrowseUrl(
  kind: MediaBrowseKind,
  options: MediaBrowseOptions,
  startIndex: number,
): string {
  const params =
    new URLSearchParams({
      kind,
      startIndex:
        String(startIndex),
      limit:
        String(pageSize),
      sort:
        options.sort,
      watch:
        options.watch,
    });

  if (options.genre) {
    params.set(
      "genre",
      options.genre,
    );
  }

  if (options.year !== null) {
    params.set(
      "year",
      String(options.year),
    );
  }

  if (options.favoriteOnly) {
    params.set(
      "favorite",
      "1",
    );
  }

  return (
    `/api/media/items?${params.toString()}`
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="relative">
      <span className="sr-only">
        {label}
      </span>

      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          onChange(
            event.target.value,
          );
        }}
        className="h-10 appearance-none rounded-full border border-white/[0.10] bg-[#17171a] py-0 pl-4 pr-9 text-xs font-medium text-white/72 outline-none transition hover:border-white/20 hover:bg-[#1d1d21] focus:border-white/30 focus:ring-2 focus:ring-white/10"
      >
        {children}
      </select>

      <svg
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 8 4 4 4-4" />
      </svg>
    </label>
  );
}

export function MediaLibraryBrowser({
  title,
  description,
  initialData,
}: MediaLibraryBrowserProps) {
  const router =
    useRouter();

  const requestRef =
    useRef<AbortController | null>(
      null,
    );

  const [
    options,
    setOptions,
  ] =
    useState<MediaBrowseOptions>(
      initialData.options,
    );

  const [
    items,
    setItems,
  ] =
    useState<MediaItem[]>(
      initialData.page.items,
    );

  const [
    facetItems,
    setFacetItems,
  ] =
    useState<MediaItem[]>(
      initialData.page.items,
    );

  const [
    page,
    setPage,
  ] =
    useState<MediaPage>(
      initialData.page,
    );

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    loadingMore,
    setLoadingMore,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(null);

  useEffect(() => {
    return () => {
      requestRef.current?.abort();
    };
  }, []);

  const genres =
    useMemo(
      () =>
        [
          ...new Set(
            facetItems.flatMap(
              (item) =>
                item.genres,
            ),
          ),
        ].sort(
          (a, b) =>
            a.localeCompare(b),
        ),
      [facetItems],
    );

  const years =
    useMemo(
      () =>
        [
          ...new Set(
            facetItems
              .map(
                (item) =>
                  item.productionYear,
              )
              .filter(
                (
                  year,
                ): year is number =>
                  year !== null,
              ),
          ),
        ].sort(
          (a, b) =>
            b - a,
        ),
      [facetItems],
    );

  const isMovieLibrary =
    initialData.kind === "movie";

  const sortOptions =
    isMovieLibrary
      ? movieSortOptions
      : collectionSortOptions;

  const activeFilterCount =
    Number(
      options.genre !== null,
    ) +
    Number(
      options.year !== null,
    ) +
    Number(
      options.watch !== "all",
    ) +
    Number(
      options.favoriteOnly,
    ) +
    Number(
      options.sort !==
        defaultMediaBrowseOptions.sort,
    );

  async function requestPage(
    nextOptions: MediaBrowseOptions,
    startIndex: number,
    append: boolean,
  ) {
    requestRef.current?.abort();

    const controller =
      new AbortController();

    requestRef.current =
      controller;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const response =
        await fetch(
          buildBrowseUrl(
            initialData.kind,
            nextOptions,
            startIndex,
          ),
          {
            signal:
              controller.signal,
            cache: "no-store",
          },
        );

      const payload =
        (
          await response.json()
        ) as BrowseApiResponse;

      if (
        response.status === 401
      ) {
        router.replace("/login");
        router.refresh();
        return;
      }

      if (!response.ok) {
        const message =
          "error" in payload
            ? payload.error
            : "Unable to load this library.";

        throw new Error(message);
      }

      if (!("media" in payload)) {
        throw new Error(
          "Pazora received an invalid library response.",
        );
      }

      const media =
        payload.media;

      setPage(media.page);

      setItems(
        (current) =>
          append
            ? mergeItems(
                current,
                media.page.items,
              )
            : media.page.items,
      );

      setFacetItems(
        (current) =>
          mergeItems(
            current,
            media.page.items,
          ),
      );
    } catch (caught) {
      if (
        caught instanceof DOMException &&
        caught.name === "AbortError"
      ) {
        return;
      }

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load this library.",
      );
    } finally {
      if (
        requestRef.current ===
        controller
      ) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }

  function applyOptions(
    nextOptions: MediaBrowseOptions,
  ) {
    setOptions(nextOptions);

    void requestPage(
      nextOptions,
      0,
      false,
    );
  }

  function resetFilters() {
    const resetOptions: MediaBrowseOptions = {
      ...defaultMediaBrowseOptions,
    };

    applyOptions(
      resetOptions,
    );
  }

  const mediaGridKey =
    [
      initialData.kind,
      options.genre ?? "all-genres",
      options.year === null
        ? "all-years"
        : String(options.year),
      options.watch,
      options.favoriteOnly
        ? "favorites"
        : "all-favorites",
      options.sort,
    ].join("|");

  const itemLabel =
    initialData.kind === "collection"
      ? page.total === 1
        ? "collection"
        : "collections"
      : page.total === 1
        ? "movie"
        : "movies";

  return (
    <section className="pazora-page-gutter pb-20 pt-[calc(var(--pazora-header-height)+3rem)]">
      <div className="mx-auto max-w-[1600px]">
        <header className="max-w-3xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d3203f]">
            Pazora Library
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-5xl">
            {title}
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/45 sm:text-[15px]">
            {description}
          </p>
        </header>

        <div className="mt-9 border-y border-white/[0.07] py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            {isMovieLibrary ? (
              <>
                <FilterSelect
                  label="Genre"
                  value={
                    options.genre ?? ""
                  }
                  onChange={(value) => {
                    applyOptions({
                      ...options,
                      genre:
                        value || null,
                    });
                  }}
                >
                  <option value="">
                    All genres
                  </option>

                  {genres.map(
                    (genre) => (
                      <option
                        key={genre}
                        value={genre}
                      >
                        {genre}
                      </option>
                    ),
                  )}
                </FilterSelect>

                <FilterSelect
                  label="Year"
                  value={
                    options.year === null
                      ? ""
                      : String(
                          options.year,
                        )
                  }
                  onChange={(value) => {
                    applyOptions({
                      ...options,
                      year:
                        value
                          ? Number(value)
                          : null,
                    });
                  }}
                >
                  <option value="">
                    All years
                  </option>

                  {years.map(
                    (year) => (
                      <option
                        key={year}
                        value={year}
                      >
                        {year}
                      </option>
                    ),
                  )}
                </FilterSelect>

                <FilterSelect
                  label="Watch state"
                  value={options.watch}
                  onChange={(value) => {
                    applyOptions({
                      ...options,
                      watch:
                        value as
                          MediaWatchFilter,
                    });
                  }}
                >
                  {watchOptions.map(
                    (watch) => (
                      <option
                        key={
                          watch.value
                        }
                        value={
                          watch.value
                        }
                      >
                        {watch.label}
                      </option>
                    ),
                  )}
                </FilterSelect>
              </>
            ) : null}

            <button
              type="button"
              aria-pressed={
                options.favoriteOnly
              }
              onClick={() => {
                applyOptions({
                  ...options,
                  favoriteOnly:
                    !options.favoriteOnly,
                });
              }}
              className={[
                "h-10 rounded-full border px-4 text-xs font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-white/20",
                options.favoriteOnly
                  ? "border-[#d3203f]/50 bg-[#d3203f]/15 text-[#f27a8f]"
                  : "border-white/[0.10] bg-[#17171a] text-white/65 hover:border-white/20 hover:bg-[#1d1d21] hover:text-white",
              ].join(" ")}
            >
              Favorites
            </button>

            <FilterSelect
              label="Sort"
              value={options.sort}
              onChange={(value) => {
                applyOptions({
                  ...options,
                  sort:
                    value as
                      MediaBrowseSort,
                });
              }}
            >
              {sortOptions.map(
                (sort) => (
                  <option
                    key={sort.value}
                    value={sort.value}
                  >
                    {sort.label}
                  </option>
                ),
              )}
            </FilterSelect>

            {activeFilterCount > 0 ? (
              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="h-10 px-2 text-xs font-medium text-white/40 transition hover:text-white/80"
              >
                Clear filters
              </button>
            ) : null}

            <p className="ml-auto text-xs text-white/32">
              {page.total}{" "}
              {itemLabel}
            </p>
          </div>
        </div>

        {error ? (
          <div className="mt-7 flex items-start justify-between gap-5 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-5 py-4">
            <div>
              <p className="text-sm font-medium text-red-200">
                Unable to update library
              </p>

              <p className="mt-1 text-xs leading-5 text-red-200/55">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                void requestPage(
                  options,
                  0,
                  false,
                );
              }}
              className="shrink-0 text-xs font-semibold text-red-100 transition hover:text-white"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div
          aria-busy={loading}
          className={[
            "mt-8 transition-opacity duration-200",
            loading
              ? "pointer-events-none opacity-35"
              : "opacity-100",
          ].join(" ")}
        >
          {items.length > 0 ? (
            <MediaGrid
              key={mediaGridKey}
              items={items}
              variant={
                initialData.kind ===
                "collection"
                  ? "landscape"
                  : "poster"
              }
            />
          ) : (
            <div className="flex min-h-[22rem] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
              <div className="max-w-sm">
                <p className="text-lg font-medium text-white/75">
                  No matches found
                </p>

                <p className="mt-2 text-sm leading-6 text-white/35">
                  Try clearing one or more filters to see more of your library.
                </p>

                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={
                      resetFilters
                    }
                    className="mt-5 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    Clear filters
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {page.hasMore &&
        page.nextStartIndex !== null ? (
          <div className="mt-12 flex justify-center">
            <button
              type="button"
              disabled={
                loading ||
                loadingMore
              }
              onClick={() => {
                void requestPage(
                  options,
                  page.nextStartIndex ?? 0,
                  true,
                );
              }}
              className="min-w-36 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 py-3 text-xs font-semibold text-white/72 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              {loadingMore
                ? "Loading..."
                : "Load more"}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}