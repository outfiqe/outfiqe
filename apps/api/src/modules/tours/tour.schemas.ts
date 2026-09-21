import type { TourOutcome } from "@outfiqe/types";
import { z } from "zod";

import { KNOWN_TOUR_KEYS } from "./tour.constants.js";

const MIN_TOUR_VERSION = 1;
const MAX_TOUR_VERSION = 1000;

const tourOutcomeValues = ["COMPLETED", "DISMISSED"] satisfies TourOutcome[];

export const tourKeyParamSchema = z.object({
  tourKey: z.enum(KNOWN_TOUR_KEYS),
});

export const recordTourOutcomeSchema = z.object({
  version: z.number().int().min(MIN_TOUR_VERSION).max(MAX_TOUR_VERSION),
  outcome: z.enum(tourOutcomeValues),
});

export type TourKeyParam = z.infer<typeof tourKeyParamSchema>;
export type RecordTourOutcomeBody = z.infer<typeof recordTourOutcomeSchema>;
