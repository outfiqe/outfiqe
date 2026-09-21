import { apiClient } from "@/shared/lib/apiClient";

import {
  type RecordTourOutcomeInput,
  type TourProgress,
  type TourProgressList,
  tourProgressListSchema,
  tourProgressSchema,
} from "./toursSchemas";

export const toursApi = {
  async listMine(): Promise<TourProgressList> {
    const { data } = await apiClient.get<TourProgressList>("/tours/me");
    return tourProgressListSchema.parse(data);
  },

  async recordOutcome({
    tourKey,
    version,
    outcome,
  }: RecordTourOutcomeInput): Promise<TourProgress> {
    const { data } = await apiClient.put<TourProgress>(`/tours/me/${tourKey}`, {
      version,
      outcome,
    });
    return tourProgressSchema.parse(data);
  },
};
