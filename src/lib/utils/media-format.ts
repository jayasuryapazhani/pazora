const ticksPerSecond = 10_000_000;

export function formatRuntime(
  runtimeTicks: number | null,
): string | null {
  if (
    runtimeTicks === null ||
    runtimeTicks <= 0
  ) {
    return null;
  }

  const totalMinutes =
    Math.round(
      runtimeTicks /
        ticksPerSecond /
        60,
    );

  const hours =
    Math.floor(totalMinutes / 60);

  const minutes =
    totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  if (minutes <= 0) {
    return `${hours}h`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatRating(
  rating: number | null,
): string | null {
  if (rating === null) {
    return null;
  }

  return rating.toFixed(1);
}

export function formatProgress(
  percentage: number | null,
): string | null {
  if (
    percentage === null ||
    percentage <= 0
  ) {
    return null;
  }

  return `${Math.round(percentage)}% watched`;
}