"use client";

import {
  useMemo,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import {
  MediaGrid,
} from "@/components/media/media-grid";
import type {
  MediaItem,
  MediaPage,
  MediaSearchData,
} from "@/types/media";

type SearchResultsProps = {
  initialData: MediaSearchData;
};

type SearchApiResponse =
  | {
      authenticated: true;
      search: MediaSearchData;
    }
  | {
      authenticated: false;
    }
  | {
      error: string;
    };

const pageSize = 36;

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

function ResultSection({
  title,
  items,
  variant,
}: {
  title: string;
  items: MediaItem[];
  variant: "poster" | "landscape";
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {title}
        </h2>

        <span className="text-xs text-white/30">
          {items.length}
        </span>
      </div>

      <MediaGrid
        items={items}
        variant={variant}
      />
    </section>
  );
}

export function SearchResults({
  initialData,
}: SearchResultsProps) {
  const router =
    useRouter();

  const [
    items,
    setItems,
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
    loadingMore,
    setLoadingMore,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(null);

  const grouped =
    useMemo(
      () => ({
        movies:
          items.filter(
            (item) =>
              item.type === "Movie",
          ),
        series:
          items.filter(
            (item) =>
              item.type === "Series",
          ),
        episodes:
          items.filter(
            (item) =>
              item.type === "Episode",
          ),
        collections:
          items.filter(
            (item) =>
              item.type === "BoxSet",
          ),
      }),
      [items],
    );

  async function loadMore() {
    if (
      loadingMore ||
      !page.hasMore ||
      page.nextStartIndex === null
    ) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const params =
        new URLSearchParams({
          q: initialData.query,
          startIndex:
            String(
              page.nextStartIndex,
            ),
          limit:
            String(pageSize),
        });

      const response =
        await fetch(
          `/api/media/search?${params.toString()}`,
          {
            cache: "no-store",
          },
        );

      const payload =
        (
          await response.json()
        ) as SearchApiResponse;

      if (response.status === 401) {
        router.replace("/login");
        router.refresh();
        return;
      }

      if (!response.ok) {
        const message =
          "error" in payload
            ? payload.error
            : "Unable to load more search results.";

        throw new Error(message);
      }

      if (!("search" in payload)) {
        throw new Error(
          "Pazora received an invalid search response.",
        );
      }

      setItems(
        (current) =>
          mergeItems(
            current,
            payload.search.page.items,
          ),
      );

      setPage(
        payload.search.page,
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load more search results.",
      );
    } finally {
      setLoadingMore(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-12 flex min-h-[24rem] items-center justify-center rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.015] px-6 text-center">
        <div className="max-w-md">
          <p className="text-xl font-medium text-white/75">
            No results found
          </p>

          <p className="mt-2 text-sm leading-6 text-white/35">
            Try another title, series, episode or collection name.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ResultSection
        title="Movies"
        items={grouped.movies}
        variant="poster"
      />

      <ResultSection
        title="TV Shows"
        items={grouped.series}
        variant="poster"
      />

      <ResultSection
        title="Episodes"
        items={grouped.episodes}
        variant="landscape"
      />

      <ResultSection
        title="Collections"
        items={grouped.collections}
        variant="landscape"
      />

      {error ? (
        <div className="mt-8 rounded-xl border border-red-400/15 bg-red-400/[0.055] px-5 py-4 text-sm text-red-200/70">
          {error}
        </div>
      ) : null}

      {page.hasMore &&
      page.nextStartIndex !== null ? (
        <div className="mt-14 flex justify-center">
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => {
              void loadMore();
            }}
            className="min-w-40 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 py-3 text-xs font-semibold text-white/72 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            {loadingMore
              ? "Loading..."
              : "Load more results"}
          </button>
        </div>
      ) : null}
    </>
  );
}