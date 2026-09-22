import type { TourOutcome } from "@outfiqe/types";
import { z } from "zod";

import { TOUR_OUTCOME } from "../constants/tourOutcome";

export const tourProgressSchema = z.object({
  tourKey: z.string(),
  version: z.number().int(),
  outcome: z.enum(TOUR_OUTCOME),
  updatedAt: z.string(),
});

export const tourProgressListSchema = z.object({
  tours: z.array(tourProgressSchema),
});

export type TourProgress = z.infer<typeof tourProgressSchema>;
export type TourProgressList = z.infer<typeof tourProgressListSchema>;

export type RecordTourOutcomeInput = {
  tourKey: string;
  version: number;
  outcome: TourOutcome;
};
