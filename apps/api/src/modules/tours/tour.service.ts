import type { TourKey, TourOutcome } from "@outfiqe/types";

import { tourRepository } from "./tour.repository.js";
import type { TourProgressList, TourProgressView } from "./tour.types.js";

export const tourService = {
  async listForUser(userId: string): Promise<TourProgressList> {
    return { tours: await tourRepository.findForUser(userId) };
  },

  async recordOutcome(
    userId: string,
    tourKey: TourKey,
    version: number,
    outcome: TourOutcome,
  ): Promise<TourProgressView> {
    return tourRepository.upsertForUser(userId, tourKey, version, outcome);
  },
};
