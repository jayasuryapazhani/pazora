import type {
  BaseItemDto,
} from "@jellyfin/sdk/lib/generated-client/models/index.js";

import type {
  MediaArtwork,
} from "@/types/media";

const posterMaxWidth = 600;
const backdropMaxWidth = 1600;
const imageQuality = 90;

type JellyfinImageType =
  | "Primary"
  | "Backdrop";

type ArtworkImageInput = {
  itemId: string;
  imageType: JellyfinImageType;
  tag: string;
  imageIndex?: number;
  maxWidth: number;
};

function getPublicJellyfinBaseUrl(): URL {
  const configured =
    process.env
      .NEXT_PUBLIC_JELLYFIN_PUBLIC_URL
      ?.trim();

  if (!configured) {
    throw new Error(
      "NEXT_PUBLIC_JELLYFIN_PUBLIC_URL is not configured.",
    );
  }

  const url =
    new URL(configured);

  if (
    url.protocol !== "http:" &&
    url.protocol !== "https:"
  ) {
    throw new Error(
      "Public Jellyfin URL must use HTTP or HTTPS.",
    );
  }

  url.search = "";
  url.hash = "";
  url.pathname =
    url.pathname.replace(/\/+$/, "");

  return url;
}

function buildArtworkImageUrl({
  itemId,
  imageType,
  tag,
  imageIndex,
  maxWidth,
}: ArtworkImageInput): string {
  const url =
    getPublicJellyfinBaseUrl();

  const basePath =
    url.pathname.replace(/\/+$/, "");

  const encodedItemId =
    encodeURIComponent(itemId);

  const encodedImageType =
    encodeURIComponent(imageType);

  const imagePath =
    imageIndex === undefined
      ? `${basePath}/Items/${encodedItemId}/Images/${encodedImageType}`
      : `${basePath}/Items/${encodedItemId}/Images/${encodedImageType}/${imageIndex}`;

  url.pathname = imagePath;

  url.searchParams.set(
    "tag",
    tag,
  );

  url.searchParams.set(
    "maxWidth",
    String(maxWidth),
  );

  url.searchParams.set(
    "quality",
    String(imageQuality),
  );

  return url.toString();
}

function getPosterUrl(
  item: BaseItemDto,
): string | null {
  if (
    item.Id &&
    item.ImageTags?.Primary
  ) {
    return buildArtworkImageUrl({
      itemId: item.Id,
      imageType: "Primary",
      tag: item.ImageTags.Primary,
      maxWidth: posterMaxWidth,
    });
  }

  if (
    item.SeriesId &&
    item.SeriesPrimaryImageTag
  ) {
    return buildArtworkImageUrl({
      itemId: item.SeriesId,
      imageType: "Primary",
      tag: item.SeriesPrimaryImageTag,
      maxWidth: posterMaxWidth,
    });
  }

  return null;
}

function getBackdropUrl(
  item: BaseItemDto,
): string | null {
  const ownBackdropTag =
    item.BackdropImageTags?.[0];

  if (
    item.Id &&
    ownBackdropTag
  ) {
    return buildArtworkImageUrl({
      itemId: item.Id,
      imageType: "Backdrop",
      tag: ownBackdropTag,
      imageIndex: 0,
      maxWidth: backdropMaxWidth,
    });
  }

  const parentBackdropTag =
    item.ParentBackdropImageTags?.[0];

  if (
    item.ParentBackdropItemId &&
    parentBackdropTag
  ) {
    return buildArtworkImageUrl({
      itemId: item.ParentBackdropItemId,
      imageType: "Backdrop",
      tag: parentBackdropTag,
      imageIndex: 0,
      maxWidth: backdropMaxWidth,
    });
  }

  return null;
}

export function getMediaArtwork(
  item: BaseItemDto,
): MediaArtwork {
  return {
    posterUrl:
      getPosterUrl(item),

    backdropUrl:
      getBackdropUrl(item),
  };
}