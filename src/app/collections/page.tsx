import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import {
  AppHeader,
} from "@/components/layout/app-header";
import {
  MediaLibraryBrowser,
} from "@/components/library/media-library-browser";
import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaBrowseData,
} from "@/lib/jellyfin/media";
import {
  defaultMediaBrowseOptions,
} from "@/lib/utils/media-query";
import type {
  MediaBrowseData,
} from "@/types/media";

export const metadata = {
  title: "Collections",
};

export const dynamic =
  "force-dynamic";

export default async function CollectionsPage() {
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

  let media: MediaBrowseData | null =
    null;

  try {
    media =
      await getMediaBrowseData(
        context,
        "collection",
        0,
        36,
        defaultMediaBrowseOptions,
      );
  } catch {
    console.warn(
      "Pazora collections query failed.",
    );
  }

  if (media === null) {
    return (
      <main className="min-h-screen bg-[#0b0b0d] text-white">
        <AppHeader
          userName={context.user.name}
          showMovies
          showSeries={false}
          showCollections
        />

        <section className="pazora-page-gutter flex min-h-screen items-center justify-center pt-20">
          <div className="max-w-md text-center">
            <p className="text-xs font-semibold tracking-[0.22em] text-[#d3203f]">
              PAZORA
            </p>

            <h1 className="mt-4 text-2xl font-semibold">
              Collections are unavailable
            </h1>

            <p className="mt-3 text-sm leading-6 text-white/45">
              Pazora could not retrieve your collections from Jellyfin.
            </p>

            <Link
              href="/collections"
              prefetch={false}
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/85"
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
        showMovies
        showSeries={false}
        showCollections
      />

      <MediaLibraryBrowser
        title="Collections"
        description="Browse movie collections and box sets from your Jellyfin library in one place."
        initialData={media}
      />
    </main>
  );
}