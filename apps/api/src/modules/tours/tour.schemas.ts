import { TourKey, TourOutcome } from "@outfiqe/types";
import { z } from "zod";

const MIN_TOUR_VERSION = 1;
const MAX_TOUR_VERSION = 1000;

export const tourKeyParamSchema = z.object({
  tourKey: z.enum(TourKey),
});

export const recordTourOutcomeSchema = z.object({
  version: z.number().int().min(MIN_TOUR_VERSION).max(MAX_TOUR_VERSION),
  outcome: z.enum(TourOutcome),
});

export type TourKeyParam = z.infer<typeof tourKeyParamSchema>;
export type RecordTourOutcomeBody = z.infer<typeof recordTourOutcomeSchema>;
