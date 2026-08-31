import {
  notFound,
  redirect,
} from "next/navigation";

import {
  PazoraVideoPlayer,
} from "@/components/player/pazora-video-player";
import {
  getJellyfinContext,
} from "@/lib/auth/jellyfin-context";
import {
  getMediaDetailsData,
  getMediaEpisodeNavigationData,
} from "@/lib/jellyfin/media";
import {
  getPlaybackPlan,
} from "@/lib/jellyfin/playback";
import {
  attachPlaybackTransport,
} from "@/lib/jellyfin/playback-transport";
import {
  parseMediaItemId,
} from "@/lib/utils/media-query";
import type {
  MediaDetailsData,
  MediaEpisodeNavigationData,
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

  let episodeNavigation:
    | MediaEpisodeNavigationData
    | null = null;

  if (
    details.item.type ===
    "Episode"
  ) {
    try {
      episodeNavigation =
        await getMediaEpisodeNavigationData(
          context,
          details.item,
        );
    } catch {
      // Playback remains available even if Jellyfin cannot
      // resolve neighboring episodes for this series.
      console.warn(
        "Pazora episode navigation query failed.",
      );
    }
  }

  let playback:
    | PlaybackPlan
    | null = null;

  try {
    const basePlayback =
      await getPlaybackPlan(
        context,
        details.item.id,
        details.item.user
          .playbackPositionTicks,
      );

    playback =
      attachPlaybackTransport(
        context,
        basePlayback,
      );
  } catch {
    console.warn(
      "Pazora secure playback preparation failed.",
    );
  }

  if (
    !playback ||
    !playback.transport.ready
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
        <div className="max-w-md text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d3203f]">
            Pazora Player
          </p>

          <h1 className="mt-4 text-2xl font-semibold">
            Unable to prepare secure playback
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/40">
            Pazora could not create a secure browser-to-Jellyfin transport for this title.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black">
      <PazoraVideoPlayer
        key={details.item.id}
        item={details.item}
        playback={playback}
        episodeNavigation={
          episodeNavigation
        }
      />
    </main>
  );
}