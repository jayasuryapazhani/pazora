"use client";

import {
  useEffect,
  useState,
} from "react";

type MediaArtworkSurfaceProps = {
  src: string | null;
  label: string;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
  wordmarkClassName?: string;
  showWordmark?: boolean;
};

export function MediaArtworkSurface({
  src,
  label,
  className = "",
  imageClassName = "",
  fallbackClassName = "",
  wordmarkClassName = "",
  showWordmark = true,
}: MediaArtworkSurfaceProps) {
  const [
    loadedSrc,
    setLoadedSrc,
  ] =
    useState<string | null>(null);

  const [
    failedSrc,
    setFailedSrc,
  ] =
    useState<string | null>(null);

  useEffect(() => {
    if (!src) {
      return;
    }

    let active = true;

    const image =
      new window.Image();

    image.decoding =
      "async";

    image.onload = () => {
      if (active) {
        setLoadedSrc(src);
      }
    };

    image.onerror = () => {
      if (active) {
        setFailedSrc(src);
      }
    };

    image.src = src;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  const failed =
    src !== null &&
    failedSrc === src;

  const loaded =
    src !== null &&
    loadedSrc === src &&
    !failed;

  const state =
    src === null
      ? "missing"
      : failed
        ? "failed"
        : loaded
          ? "loaded"
          : "loading";

  const resolvedFallback =
    fallbackClassName ||
    "bg-[radial-gradient(circle_at_50%_25%,rgba(211,32,63,0.18),transparent_42%),linear-gradient(145deg,#1c1c21,#0f0f12)]";

  return (
    <div
      role="img"
      aria-label={label}
      data-artwork-state={state}
      className={[
        "overflow-hidden",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "absolute inset-0 flex items-center justify-center",
          resolvedFallback,
        ].join(" ")}
      >
        {showWordmark ? (
          <span
            className={[
              "font-semibold tracking-[0.22em] text-[#d3203f]",
              wordmarkClassName ||
                "text-[10px]",
            ].join(" ")}
          >
            PAZORA
          </span>
        ) : null}
      </div>

      {loaded ? (
        <div
          aria-hidden="true"
          className={[
            "absolute inset-0 bg-cover bg-center",
            imageClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            backgroundImage:
              `url("${src}")`,
          }}
        />
      ) : null}
    </div>
  );
}