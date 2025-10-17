export type SwipeTelemetry = {
  positiveSwipes: number;
  negativeSwipes: number;
  lastReflectionIndex: number;
};

export function shouldForceReflection({
  positiveSwipes,
  negativeSwipes,
  lastReflectionIndex,
}: SwipeTelemetry, interval = 5): boolean {
  const totalSwipes = positiveSwipes + negativeSwipes;
  if (totalSwipes === 0) return false;
  if (interval <= 0) return false;
  return totalSwipes - lastReflectionIndex >= interval;
}

export function registerSwipe(
  telemetry: SwipeTelemetry,
  swipe: "positive" | "negative",
  interval = 5,
): SwipeTelemetry {
  const updated: SwipeTelemetry = { ...telemetry };
  if (swipe === "positive") {
    updated.positiveSwipes += 1;
  } else {
    updated.negativeSwipes += 1;
  }

  if (shouldForceReflection(updated, interval)) {
    updated.lastReflectionIndex = updated.positiveSwipes + updated.negativeSwipes;
  }

  return updated;
}

export function nextReflectionTrigger(
  telemetry: SwipeTelemetry,
  interval = 5,
): number {
  if (interval <= 0) return Infinity;
  const total = telemetry.positiveSwipes + telemetry.negativeSwipes;
  const nextThreshold = telemetry.lastReflectionIndex + interval;
  return Math.max(nextThreshold - total, 0);
}
