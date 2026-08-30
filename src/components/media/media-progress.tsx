import {
  formatProgress,
} from "@/lib/utils/media-format";

type MediaProgressProps = {
  percentage: number | null;
  compact?: boolean;
};

export function MediaProgress({
  percentage,
  compact = false,
}: MediaProgressProps) {
  if (
    percentage === null ||
    percentage <= 0 ||
    percentage >= 100
  ) {
    return null;
  }

  const value =
    Math.min(
      100,
      Math.max(
        0,
        percentage,
      ),
    );

  const label =
    formatProgress(value);

  if (!label) {
    return null;
  }

  return (
    <div
      className={
        compact
          ? "max-w-[19rem]"
          : "max-w-[28rem]"
      }
    >
      <div className="flex items-center justify-between gap-3 text-[11px] font-medium">
        <span className="text-[#ef6079]">
          {label}
        </span>

        <span className="text-white/35">
          In progress
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={
          Math.round(value)
        }
        className="mt-2 h-1 overflow-hidden rounded-full bg-white/15"
      >
        <div
          className="h-full rounded-full bg-[#d3203f]"
          style={{
            width: `${value}%`,
          }}
        />
      </div>
    </div>
  );
}