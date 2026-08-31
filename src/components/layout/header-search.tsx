"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import type {
  MediaItem,
  MediaSearchData,
} from "@/types/media";

type SearchResponse =
  | {
      authenticated: true;
      search: MediaSearchData;
    }
  | {
      authenticated?: false;
      error?: string;
    };

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[19px] w-[19px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle
        cx="11"
        cy="11"
        r="7"
      />

      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6 18 18" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

function resultArtwork(
  item: MediaItem,
): string | null {
  return (
    item.artwork.backdropUrl ??
    item.artwork.posterUrl
  );
}

function resultType(
  item: MediaItem,
): string {
  if (item.type === "BoxSet") {
    return "Collection";
  }

  return item.type;
}

export function HeaderSearch() {
  const router =
    useRouter();

  const inputRef =
    useRef<HTMLInputElement>(null);

  const requestVersionRef =
    useRef(0);

  const [open, setOpen] =
    useState(false);

  const [query, setQuery] =
    useState("");

  const [results, setResults] =
    useState<MediaItem[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const clearSearchState =
    useCallback(() => {
      requestVersionRef.current += 1;

      setQuery("");
      setResults([]);
      setError(null);
      setLoading(false);
    }, []);

  const closeSearch =
    useCallback(() => {
      setOpen(false);
      clearSearchState();
    }, [clearSearchState]);


  function openFullSearch(
    value: string,
  ) {
    const normalized =
      value.trim();

    if (!normalized) {
      return;
    }

    closeSearch();

    router.push(
      `/search?q=${encodeURIComponent(normalized)}`,
    );
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const frame =
      window.requestAnimationFrame(
        () => {
          inputRef.current?.focus();
        },
      );

    return () => {
      window.cancelAnimationFrame(
        frame,
      );
    };
  }, [open]);

  useEffect(() => {
    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape" &&
        open
      ) {
        closeSearch();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [
    closeSearch,
    open,
  ]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const normalized =
      query.trim();

    if (!normalized) {
      return;
    }

    const requestVersion =
      requestVersionRef.current;

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        () => {
          void (async () => {
            try {
              const response =
                await fetch(
                  `/api/media/search?q=${encodeURIComponent(normalized)}&startIndex=0&limit=8`,
                  {
                    cache:
                      "no-store",
                    signal:
                      controller.signal,
                  },
                );

              const body =
                (await response.json()) as
                  SearchResponse;

              if (
                controller.signal.aborted ||
                requestVersion !==
                  requestVersionRef.current
              ) {
                return;
              }

              if (
                response.status === 401
              ) {
                closeSearch();

                router.replace(
                  "/login",
                );

                router.refresh();

                return;
              }

              if (!response.ok) {
                throw new Error(
                  "error" in body &&
                    body.error
                    ? body.error
                    : "Unable to search.",
                );
              }

              if (
                body.authenticated !== true
              ) {
                throw new Error(
                  "Search session is invalid.",
                );
              }

              setResults(
                body.search.page.items,
              );
            } catch (caught) {
              if (
                controller.signal.aborted ||
                requestVersion !==
                  requestVersionRef.current
              ) {
                return;
              }

              if (
                caught instanceof
                  DOMException &&
                caught.name ===
                  "AbortError"
              ) {
                return;
              }

              setResults([]);

              setError(
                caught instanceof Error
                  ? caught.message
                  : "Unable to search.",
              );
            } finally {
              if (
                !controller.signal.aborted &&
                requestVersion ===
                  requestVersionRef.current
              ) {
                setLoading(false);
              }
            }
          })();
        },
        250,
      );

    return () => {
      window.clearTimeout(
        timer,
      );

      controller.abort();
    };
  }, [
    closeSearch,
    open,
    query,
    router,
  ]);

  const normalizedQuery =
    query.trim();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (open) {
            closeSearch();
          } else {
            setOpen(true);
          }
        }}
        aria-label={
          open
            ? "Close search"
            : "Search Pazora"
        }
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white/75 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
      >
        {open ? (
          <CloseIcon />
        ) : (
          <SearchIcon />
        )}
      </button>

      {open ? (
        <section
          aria-label="Search Pazora"
          className="fixed left-[var(--pazora-page-gutter)] right-[var(--pazora-page-gutter)] top-[calc(var(--pazora-header-height)-0.15rem)] ml-auto max-w-[28rem] overflow-hidden rounded-lg border border-white/10 bg-[#151518]/[0.98] shadow-[0_28px_90px_rgba(0,0,0,0.68)] backdrop-blur-2xl"
        >
          <div className="flex items-center gap-3 border-b border-white/[0.08] px-4">
            <span
              aria-hidden="true"
              className="shrink-0 text-white/45"
            >
              <SearchIcon />
            </span>

            <input
              ref={inputRef}
              type="search"
              value={query}
              autoComplete="off"
              spellCheck={false}
              placeholder="Search movies, shows, episodes..."
              aria-label="Search movies, shows, episodes and collections"
              onChange={(event) => {
                const value =
                  event.target.value;

                const normalized =
                  value.trim();

                requestVersionRef.current +=
                  1;

                setQuery(value);
                setResults([]);
                setError(null);
                setLoading(
                  normalized.length > 0,
                );
              }}
              onKeyDown={(event) => {
                if (
                  event.key ===
                    "Enter" &&
                  normalizedQuery
                ) {
                  event.preventDefault();

                  openFullSearch(
                    normalizedQuery,
                  );
                }
              }}
              className="h-12 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />

            {loading ? (
              <span className="shrink-0 text-[11px] text-white/35">
                Searching…
              </span>
            ) : null}
          </div>

          {normalizedQuery ? (
            <div className="max-h-[min(65vh,32rem)] overflow-y-auto p-2">
              {error ? (
                <p
                  role="alert"
                  className="px-3 py-4 text-sm text-red-300"
                >
                  {error}
                </p>
              ) : null}

              {!error &&
              !loading &&
              results.length === 0 ? (
                <p className="px-3 py-5 text-sm text-white/40">
                  No titles found.
                </p>
              ) : null}

              {results.map(
                (item) => {
                  const artwork =
                    resultArtwork(
                      item,
                    );

                  return (
                    <Link
                      key={item.id}
                      href={`/title/${item.id}`}
                      prefetch={false}
                      onClick={() => {
                        closeSearch();
                      }}
                      className="flex items-center gap-3 rounded-md p-2.5 transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      <div className="relative h-12 w-[5.25rem] shrink-0 overflow-hidden rounded bg-[#242429]">
                        {artwork ? (
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-cover bg-center"
                            style={{
                              backgroundImage:
                                `url("${artwork}")`,
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-[#1c1c20] text-[8px] font-semibold tracking-[0.18em] text-[#d3203f]">
                            PAZORA
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {item.name}
                        </p>

                        <p className="mt-1 truncate text-[11px] text-white/40">
                          {[
                            resultType(
                              item,
                            ),
                            item.productionYear ??
                              null,
                            item.seriesName ??
                              null,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              " • ",
                            )}
                        </p>
                      </div>
                    </Link>
                  );
                },
              )}
            </div>
          ) : (
            <p className="px-4 py-4 text-xs text-white/35">
              Search your private
              Jellyfin library.
            </p>
          )}
        </section>
      ) : null}
    </div>
  );
}