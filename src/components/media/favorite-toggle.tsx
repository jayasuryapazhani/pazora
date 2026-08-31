"use client";

import {
  useRouter,
} from "next/navigation";
import {
  useState,
} from "react";

type FavoriteToggleProps = {
  itemId: string;
  itemName: string;
  initialFavorite: boolean;
};

type FavoriteResponse = {
  favorite?: boolean;
};

export function FavoriteToggle({
  itemId,
  itemName,
  initialFavorite,
}: FavoriteToggleProps) {
  const router =
    useRouter();

  const [
    favorite,
    setFavorite,
  ] =
    useState(initialFavorite);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(null);

  async function toggleFavorite() {
    if (saving) {
      return;
    }

    const previous =
      favorite;

    const next =
      !previous;

    setFavorite(next);
    setSaving(true);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/media/items/${encodeURIComponent(
            itemId,
          )}/favorite`,
          {
            method: "POST",
            credentials:
              "same-origin",
            cache: "no-store",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              favorite: next,
            }),
          },
        );

      if (!response.ok) {
        throw new Error(
          "Favorite update failed.",
        );
      }

      const payload =
        (await response.json()) as
          FavoriteResponse;

      if (
        typeof payload.favorite ===
        "boolean"
      ) {
        setFavorite(
          payload.favorite,
        );
      }

      router.refresh();
    } catch {
      setFavorite(previous);

      setError(
        "Could not update My Favorites.",
      );
    } finally {
      setSaving(false);
    }
  }

  const label =
    favorite
      ? "In My Favorites"
      : "My Favorites";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => {
          void toggleFavorite();
        }}
        disabled={saving}
        aria-pressed={favorite}
        aria-label={
          favorite
            ? `Remove ${itemName} from My Favorites`
            : `Add ${itemName} to My Favorites`
        }
        className={[
          "inline-flex min-h-10 items-center gap-2 rounded-md border px-5 py-2.5 text-sm font-semibold transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
          "disabled:cursor-wait disabled:opacity-65",
          favorite
            ? "border-white/35 bg-white/15 text-white hover:bg-white/20"
            : "border-white/25 bg-black/30 text-white hover:border-white/45 hover:bg-white/10",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className="text-lg leading-none"
        >
          {favorite
            ? "\u2713"
            : "+"}
        </span>

        <span>
          {saving
            ? "Saving..."
            : label}
        </span>
      </button>

      {error ? (
        <p
          role="alert"
          className="text-xs text-[#ef6079]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}