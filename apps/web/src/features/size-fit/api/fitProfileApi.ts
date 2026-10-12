import type { FitMeasurements } from "@outfiqe/utils";
import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

const FIT_PROFILE_PATH = "/fit-profile/me";

const fitProfileSchema = z.object({ heightCm: z.number(), weightKg: z.number() }).nullable();

export const fitProfileApi = {
  async getMine(): Promise<FitMeasurements | null> {
    const res = await apiClient.get<FitMeasurements | null>(FIT_PROFILE_PATH);
    return fitProfileSchema.parse(res.data);
  },

  async save(measurements: FitMeasurements): Promise<FitMeasurements | null> {
    const res = await apiClient.put<FitMeasurements>(FIT_PROFILE_PATH, measurements);
    return fitProfileSchema.parse(res.data);
  },

  async remove(): Promise<void> {
    await apiClient.del(FIT_PROFILE_PATH);
  },
};
