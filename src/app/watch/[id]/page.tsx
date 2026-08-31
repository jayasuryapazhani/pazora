import {
  notFound,
  redirect,
} from "next/navigation";

import {
  PlaybackFoundation,
} from "@/components/player/playback-foundation";
import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaDetailsData,
} from "@/lib/jellyfin/media";
import {
  getPlaybackPlan,
} from "@/lib/jellyfin/playback";
import {
  parseMediaItemId,
} from "@/lib/utils/media-query";
import type {
  MediaDetailsData,
} from "@/types/media";
import type {
  PlaybackPlan,
} from "@/types/playback";

type WatchPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic =
  "force-dynamic";

function getUpstreamStatus(
  error: unknown,
): number | null {
  if (
    typeof error !== "object" ||
    error === null
  ) {
    return null;
  }

  const response =
    Reflect.get(
      error,
      "response",
    );

  if (
    typeof response !== "object" ||
    response === null
  ) {
    return null;
  }

  const status =
    Reflect.get(
      response,
      "status",
    );

  return typeof status === "number"
    ? status
    : null;
}

export default async function WatchPage({
  params,
}: WatchPageProps) {
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

  const routeParams =
    await params;

  const itemId =
    parseMediaItemId(
      routeParams.id,
      "id",
    );

  if (!itemId.ok) {
    notFound();
  }

  let details:
    | MediaDetailsData
    | null = null;

  try {
    details =
      await getMediaDetailsData(
        context,
        itemId.value,
      );
  } catch (error) {
    if (
      getUpstreamStatus(error) ===
      404
    ) {
      notFound();
    }

    console.warn(
      "Pazora watch details query failed.",
    );
  }

  if (!details) {
    notFound();
  }

  if (
    details.item.type !== "Movie" &&
    details.item.type !== "Episode"
  ) {
    redirect(
      `/title/${details.item.id}`,
    );
  }

  let playback:
    | PlaybackPlan
    | null = null;

  try {
    playback =
      await getPlaybackPlan(
        context,
        details.item.id,
        details.item.user
          .playbackPositionTicks,
      );
  } catch {
    console.warn(
      "Pazora playback preparation failed.",
    );
  }

  if (!playback) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#070709] px-6 text-white">
        <div className="max-w-md text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d3203f]">
            Pazora Player
          </p>

          <h1 className="mt-4 text-2xl font-semibold">
            Unable to prepare playback
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/40">
            Jellyfin did not return a usable playback plan for this item.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070709]">
      <PlaybackFoundation
        item={details.item}
        playback={playback}
      />
    </main>
  );
}