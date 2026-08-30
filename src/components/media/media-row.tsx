"use client";

import {
  useRef,
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
};

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
}: MediaRowProps) {
  const scroller =
    useRef<HTMLDivElement>(null);

  if (items.length === 0) {
    return null;
  }

  function move(
    direction: "left" | "right",
  ) {
    const element =
      scroller.current;

    if (!element) {
      return;
    }

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
          className="pazora-scrollbar-hidden flex snap-x snap-proximity gap-3.5 overflow-x-auto overscroll-x-contain px-[var(--pazora-page-gutter)] pb-5 pt-1 sm:gap-4"
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="snap-start"
            >
              <MediaCard
                item={item}
                variant={variant}
              />
            </div>
          ))}
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