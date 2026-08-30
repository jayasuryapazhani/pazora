"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  MediaCard,
} from "@/components/media/media-card";
import type {
  MediaItem,
} from "@/types/media";

type MediaGridProps = {
  items: MediaItem[];
  variant: "poster" | "landscape";
};

const inlineOpenDelayMs = 300;
const inlineCloseDelayMs = 160;

function supportsInlineExpansion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches
  );
}

function itemSizeClass(
  variant: "poster" | "landscape",
  expanded: boolean,
): string {
  if (expanded) {
    return [
      "w-[clamp(30rem,42vw,39rem)]",
      "h-[clamp(21rem,24vw,25rem)]",
    ].join(" ");
  }

  if (variant === "landscape") {
    return [
      "w-full",
      "h-[9.75rem]",
      "sm:w-[clamp(16rem,22vw,22rem)]",
      "sm:h-[clamp(9rem,12.375vw,12.375rem)]",
    ].join(" ");
  }

  return [
    "w-[calc(50%_-_0.5rem)]",
    "h-[14.75rem]",
    "sm:w-[clamp(9.5rem,12.75vw,14rem)]",
    "sm:h-[clamp(17rem,21vw,23rem)]",
  ].join(" ");
}

export function MediaGrid({
  items,
  variant,
}: MediaGridProps) {
  const openTimerRef =
    useRef<number | null>(null);

  const closeTimerRef =
    useRef<number | null>(null);

  const [
    activeItemId,
    setActiveItemId,
  ] =
    useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (
        openTimerRef.current !== null
      ) {
        window.clearTimeout(
          openTimerRef.current,
        );
      }

      if (
        closeTimerRef.current !== null
      ) {
        window.clearTimeout(
          closeTimerRef.current,
        );
      }
    };
  }, []);


  function clearOpenTimer() {
    if (
      openTimerRef.current !== null
    ) {
      window.clearTimeout(
        openTimerRef.current,
      );

      openTimerRef.current = null;
    }
  }

  function clearCloseTimer() {
    if (
      closeTimerRef.current !== null
    ) {
      window.clearTimeout(
        closeTimerRef.current,
      );

      closeTimerRef.current = null;
    }
  }

  function activateNow(
    itemId: string,
  ) {
    if (!supportsInlineExpansion()) {
      return;
    }

    clearOpenTimer();
    clearCloseTimer();

    setActiveItemId(itemId);
  }

  function scheduleOpen(
    itemId: string,
  ) {
    if (!supportsInlineExpansion()) {
      return;
    }

    clearOpenTimer();
    clearCloseTimer();

    if (
      activeItemId === itemId
    ) {
      return;
    }

    openTimerRef.current =
      window.setTimeout(
        () => {
          openTimerRef.current =
            null;

          setActiveItemId(
            itemId,
          );
        },
        inlineOpenDelayMs,
      );
  }

  function scheduleClose() {
    clearOpenTimer();
    clearCloseTimer();

    closeTimerRef.current =
      window.setTimeout(
        () => {
          closeTimerRef.current =
            null;

          setActiveItemId(null);
        },
        inlineCloseDelayMs,
      );
  }

  function closeImmediately() {
    clearOpenTimer();
    clearCloseTimer();

    setActiveItemId(null);
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-8">
      {items.map(
        (item) => {
          const expanded =
            activeItemId ===
            item.id;

          return (
            <div
              key={item.id}
              data-expanded={
                expanded
                  ? "true"
                  : "false"
              }
              className={[
                "shrink-0 transition-[width,height] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                itemSizeClass(
                  variant,
                  expanded,
                ),
              ].join(" ")}
            >
              <MediaCard
                item={item}
                variant={variant}
                expanded={expanded}
                displayMode="library"
                onPointerEnter={() => {
                  scheduleOpen(
                    item.id,
                  );
                }}
                onPointerLeave={
                  scheduleClose
                }
                onFocus={() => {
                  activateNow(
                    item.id,
                  );
                }}
                onBlur={
                  scheduleClose
                }
                onEscape={
                  closeImmediately
                }
              />
            </div>
          );
        },
      )}
    </div>
  );
}