import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  HomeContent,
} from "@/components/home/home-content";
import {
  AppHeader,
} from "@/components/layout/app-header";
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
  title: "Home",
};

export const dynamic =
  "force-dynamic";

export default async function BrowsePage() {
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
      "Pazora home media query failed.",
    );
  }

  if (media === null) {
    return (
      <main className="min-h-screen bg-[#0b0b0d] text-white">
        <AppHeader
          userName={context.user.name}
          showMovies={false}
          showSeries={false}
          showCollections={false}
        />

        <section className="pazora-page-gutter flex min-h-screen items-center justify-center pt-20">
          <div className="max-w-md text-center">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#d3203f]">
              PAZORA
            </p>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
              Something went wrong
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/45">
              Pazora could not load your
              media library. Check that
              Jellyfin is available and
              try again.
            </p>

            <Link
              href="/browse"
              className="mt-6 inline-flex rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Retry
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-white">
      <AppHeader
        userName={context.user.name}
        showMovies={
          media.movies.items.length > 0
        }
        showSeries={
          media.series.items.length > 0
        }
        showCollections={
          media.collections.items.length >
          0
        }
      />

      <HomeContent
        media={media}
      />
    </main>
  );
}