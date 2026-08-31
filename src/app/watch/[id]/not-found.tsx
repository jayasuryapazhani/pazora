import Link from "next/link";

export default function WatchNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="max-w-lg text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d3203f]">
          Pazora Player
        </p>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          This title cannot be played
        </h1>

        <p className="mt-4 text-sm leading-6 text-white/45">
          The media item is no longer
          available in Jellyfin. It may
          have been removed, renamed or
          rescanned.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            href="/browse"
            prefetch={false}
            className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-white/85"
          >
            Back to Home
          </Link>

          <Link
            href="/movies"
            prefetch={false}
            className="rounded-md border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-white/75 transition hover:bg-white/[0.08] hover:text-white"
          >
            Browse Movies
          </Link>
        </div>
      </div>
    </main>
  );
}