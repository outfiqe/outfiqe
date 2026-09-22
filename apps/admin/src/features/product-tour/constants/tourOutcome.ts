import type { TourOutcome } from "@outfiqe/types";

export const TOUR_OUTCOME = {
  COMPLETED: "COMPLETED",
  DISMISSED: "DISMISSED",
} as const satisfies Record<string, TourOutcome>;
