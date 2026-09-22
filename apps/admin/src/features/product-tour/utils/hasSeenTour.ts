import type { TourProgress } from "../api/toursSchemas";

export const hasSeenTour = (
  tours: readonly TourProgress[],
  tourKey: string,
  currentVersion: number,
): boolean => tours.some((tour) => tour.tourKey === tourKey && tour.version >= currentVersion);
