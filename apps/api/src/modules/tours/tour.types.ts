import type { TourKey, TourOutcome } from "@outfiqe/types";

export type TourProgressView = {
  tourKey: TourKey;
  version: number;
  outcome: TourOutcome;
  updatedAt: Date;
};

export type TourProgressList = {
  tours: TourProgressView[];
};
