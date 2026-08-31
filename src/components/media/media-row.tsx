"use client";

import {
  useCallback,
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

type MediaRowProps = {
  id: string;
  title: string;
  items: MediaItem[];
  variant?: "poster" | "landscape";
  action?: "details" | "resume";
};

const inlineOpenDelayMs = 300;
const inlineCloseDelayMs = 160;
const visibilityInsetPx = 18;

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
      "w-[clamp(15rem,23vw,22rem)]",
      "h-[clamp(8.4375rem,12.94vw,12.375rem)]",
    ].join(" ");
  }

  return [
    "w-[clamp(9.25rem,13vw,12rem)]",
    "h-[clamp(16.625rem,22.2vw,20.75rem)]",
  ].join(" ");
}

function ArrowIcon({
  direction,
}: {
  direction: "left" | "right";
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={[
        "h-6 w-6",
        direction === "left"
          ? "rotate-180"
          : "",
      ].join(" ")}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function MediaRow({
  id,
  title,
  items,
  variant = "poster",
  action = "details",
}: MediaRowProps) {
  const scroller =
    useRef<HTMLDivElement>(null);

  const itemElements =
    useRef<
      Map<string, HTMLDivElement>
    >(
      new Map(),
    );

  const openTimerRef =
    useRef<number | null>(null);

  const closeTimerRef =
    useRef<number | null>(null);

  const [
    activeItemId,
    setActiveItemId,
  ] =
    useState<string | null>(null);

  const ensureItemVisible =
    useCallback(
      (
        itemId: string,
      ) => {
        const scrollElement =
          scroller.current;

        const itemElement =
          itemElements.current.get(
            itemId,
          );

        if (
          !scrollElement ||
          !itemElement
        ) {
          return;
        }

        const scrollerRect =
          scrollElement.getBoundingClientRect();

        const itemRect =
          itemElement.getBoundingClientRect();

        const leftBoundary =
          scrollerRect.left +
          visibilityInsetPx;

        const rightBoundary =
          scrollerRect.right -
          visibilityInsetPx;

        let delta = 0;

        if (
          itemRect.right >
          rightBoundary
        ) {
          delta =
            itemRect.right -
            rightBoundary;
        } else if (
          itemRect.left <
          leftBoundary
        ) {
          delta =
            itemRect.left -
            leftBoundary;
        }

        if (
          Math.abs(delta) < 1
        ) {
          return;
        }

        scrollElement.scrollBy({
          left: delta,
          behavior: "smooth",
        });
      },
      [],
    );

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

  useEffect(() => {
    if (!activeItemId) {
      return;
    }

    let secondFrame:
      | number
      | null = null;

    const firstFrame =
      window.requestAnimationFrame(
        () => {
          secondFrame =
            window.requestAnimationFrame(
              () => {
                ensureItemVisible(
                  activeItemId,
                );
              },
            );
        },
      );

    return () => {
      window.cancelAnimationFrame(
        firstFrame,
      );

      if (secondFrame !== null) {
        window.cancelAnimationFrame(
          secondFrame,
        );
      }
    };
  }, [
    activeItemId,
    ensureItemVisible,
  ]);

  if (items.length === 0) {
    return null;
  }

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

  function move(
    direction: "left" | "right",
  ) {
    const element =
      scroller.current;

    if (!element) {
      return;
    }

    closeImmediately();

    const amount =
      Math.max(
        320,
        element.clientWidth * 0.82,
      );

    element.scrollBy({
      left:
        direction === "left"
          ? -amount
          : amount,
      behavior: "smooth",
    });
  }

  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24"
    >
      <div className="pazora-page-gutter mb-3.5">
        <h2
          id={`${id}-title`}
          className="text-lg font-semibold tracking-tight text-white sm:text-xl"
        >
          {title}
        </h2>
      </div>

      <div className="group/row relative">
        <button
          type="button"
          onClick={() => {
            move("left");
          }}
          aria-label={`Scroll ${title} left`}
          aria-controls={`${id}-scroller`}
          className="absolute inset-y-0 left-0 z-20 hidden w-12 items-center justify-center bg-gradient-to-r from-black/85 via-black/55 to-transparent text-white/75 opacity-0 transition hover:text-white focus-visible:opacity-100 group-hover/row:opacity-100 md:flex"
        >
          <ArrowIcon
            direction="left"
          />
        </button>

        <div
          id={`${id}-scroller`}
          ref={scroller}
          className="pazora-scrollbar-hidden flex snap-x snap-proximity items-start gap-3.5 overflow-x-auto overscroll-x-contain px-[var(--pazora-page-gutter)] pb-5 pt-1 sm:gap-4"
        >
          {items.map(
            (item) => {
              const expanded =
                activeItemId ===
                item.id;

              return (
                <div
                  key={item.id}
                  ref={(node) => {
                    if (node) {
                      itemElements.current.set(
                        item.id,
                        node,
                      );
                    } else {
                      itemElements.current.delete(
                        item.id,
                      );
                    }
                  }}
                  data-expanded={
                    expanded
                      ? "true"
                      : "false"
                  }
                  onTransitionEnd={(
                    event,
                  ) => {
                    if (
                      event.propertyName ===
                        "width" &&
                      expanded
                    ) {
                      ensureItemVisible(
                        item.id,
                      );
                    }
                  }}
                  className={[
                    "snap-start shrink-0 transition-[width,height] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
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
                    action={action}
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

        <button
          type="button"
          onClick={() => {
            move("right");
          }}
          aria-label={`Scroll ${title} right`}
          aria-controls={`${id}-scroller`}
          className="absolute inset-y-0 right-0 z-20 hidden w-12 items-center justify-center bg-gradient-to-l from-black/85 via-black/55 to-transparent text-white/75 opacity-0 transition hover:text-white focus-visible:opacity-100 group-hover/row:opacity-100 md:flex"
        >
          <ArrowIcon
            direction="right"
          />
        </button>
      </div>
    </section>
  );
}