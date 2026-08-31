import {
  redirect,
} from "next/navigation";

import {
  AppHeader,
} from "@/components/layout/app-header";
import {
  SearchResults,
} from "@/components/search/search-results";
import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaSearchData,
} from "@/lib/jellyfin/media";
import {
  parseMediaSearchTerm,
} from "@/lib/utils/media-query";
import type {
  MediaSearchData,
} from "@/types/media";

type SearchPageProps = {
  searchParams: Promise<{
    q?: string | string[];
  }>;
};

export const metadata = {
  title: "Search",
};

export const dynamic =
  "force-dynamic";

function getRawQuery(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function SearchPage({
  searchParams,
}: SearchPageProps) {
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

  const params =
    await searchParams;

  const rawQuery =
    getRawQuery(params.q);

  if (!rawQuery?.trim()) {
    return (
      <main className="min-h-screen bg-[#0b0b0d] text-white">
        <AppHeader
          userName={context.user.name}
        />

        <section className="pazora-page-gutter pb-20 pt-[calc(var(--pazora-header-height)+4rem)]">
          <div className="mx-auto max-w-[1600px]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d3203f]">
              Pazora Search
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
              Search your library
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-white/42">
              Use the search button in the header to find movies, TV shows, episodes and collections.
            </p>
          </div>
        </section>
      </main>
    );
  }

  const query =
    parseMediaSearchTerm(
      rawQuery,
    );

  if (!query.ok) {
    return (
      <main className="min-h-screen bg-[#0b0b0d] text-white">
        <AppHeader
          userName={context.user.name}
        />

        <section className="pazora-page-gutter pb-20 pt-[calc(var(--pazora-header-height)+4rem)]">
          <div className="mx-auto max-w-[1600px]">
            <h1 className="text-3xl font-semibold">
              Search request is invalid
            </h1>

            <p className="mt-3 text-sm text-white/45">
              {query.error}
            </p>
          </div>
        </section>
      </main>
    );
  }

  let search:
    | MediaSearchData
    | null = null;

  try {
    search =
      await getMediaSearchData(
        context,
        query.value,
        0,
        36,
      );
  } catch {
    console.warn(
      "Pazora full search query failed.",
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white">
      <AppHeader
        userName={context.user.name}
      />

      <section className="pazora-page-gutter pb-24 pt-[calc(var(--pazora-header-height)+3.5rem)]">
        <div className="mx-auto max-w-[1600px]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d3203f]">
            Pazora Search
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
            Results for
            <span className="ml-2 text-white/45">
              &ldquo;{query.value}&rdquo;
            </span>
          </h1>

          {search ? (
            <SearchResults
              initialData={search}
            />
          ) : (
            <div className="mt-10 rounded-xl border border-red-400/15 bg-red-400/[0.055] px-5 py-5">
              <p className="text-sm font-medium text-red-100">
                Search is unavailable
              </p>

              <p className="mt-1 text-xs leading-5 text-red-200/50">
                Pazora could not retrieve search results from Jellyfin.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}