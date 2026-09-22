import type { RecordTourOutcomeInput, TourProgressList } from "../api/toursSchemas";

export const withRecordedOutcome = (
  savedProgress: TourProgressList | undefined,
  { tourKey, version, outcome }: RecordTourOutcomeInput,
  recordedAt: Date,
): TourProgressList => {
  const otherTours = (savedProgress?.tours ?? []).filter((tour) => tour.tourKey !== tourKey);
  return {
    tours: [...otherTours, { tourKey, version, outcome, updatedAt: recordedAt.toISOString() }],
  };
};
