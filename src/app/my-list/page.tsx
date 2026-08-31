import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  AppHeader,
} from "@/components/layout/app-header";
import {
  MediaGrid,
} from "@/components/media/media-grid";
import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaHomeData,
} from "@/lib/jellyfin/media";
import type {
  MediaHomeData,
} from "@/types/media";

export const metadata = {
  title: "My List",
};

export const dynamic =
  "force-dynamic";

export default async function MyListPage() {
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

  let media: MediaHomeData | null =
    null;

  try {
    media =
      await getMediaHomeData(
        context,
      );
  } catch {
    console.warn(
      "Pazora My List query failed.",
    );
  }

  if (media === null) {
    return (
      <main className="min-h-screen bg-[#0b0b0d] text-white">
        <AppHeader
          userName={context.user.name}
        />

        <section className="pazora-page-gutter flex min-h-screen items-center justify-center pt-20">
          <div className="max-w-md text-center">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#d3203f]">
              PAZORA
            </p>

            <h1 className="mt-4 text-2xl font-semibold">
              My List is unavailable
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/45">
              Pazora could not retrieve
              your favorites from
              Jellyfin.
            </p>

            <Link
              href="/my-list"
              prefetch={false}
              className="mt-6 inline-flex rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/85"
            >
              Retry
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const favorites =
    media.favorites.items;

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white">
      <AppHeader
        userName={context.user.name}
      />

      <section className="pazora-page-gutter pb-24 pt-[calc(var(--pazora-header-height)+3.5rem)]">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d3203f]">
            Personal
          </p>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                My List
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/45">
                Movies, TV shows and
                collections you saved
                to watch later.
              </p>
            </div>

            {favorites.length > 0 ? (
              <p className="text-sm text-white/35">
                {favorites.length}{" "}
                {favorites.length === 1
                  ? "title"
                  : "titles"}
              </p>
            ) : null}
          </div>
        </div>

        {favorites.length > 0 ? (
          <MediaGrid
            items={favorites}
            variant="poster"
          />
        ) : (
          <div className="flex min-h-[22rem] items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] px-6 text-center">
            <div className="max-w-md">
              <div
                aria-hidden="true"
                className="text-4xl text-white/30"
              >
                +
              </div>

              <h2 className="mt-5 text-xl font-semibold">
                Your list is empty
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Open any title and
                select My Favorites to
                save it here.
              </p>

              <Link
                href="/browse"
                prefetch={false}
                className="mt-6 inline-flex rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/85"
              >
                Browse titles
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}