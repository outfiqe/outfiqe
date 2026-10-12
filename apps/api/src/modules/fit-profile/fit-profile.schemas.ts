import {
  FIT_HEIGHT_CM_MAX,
  FIT_HEIGHT_CM_MIN,
  FIT_WEIGHT_KG_MAX,
  FIT_WEIGHT_KG_MIN,
} from "@outfiqe/utils";
import { z } from "zod";

export const saveFitProfileSchema = z.object({
  heightCm: z.number().int().min(FIT_HEIGHT_CM_MIN).max(FIT_HEIGHT_CM_MAX),
  weightKg: z.number().int().min(FIT_WEIGHT_KG_MIN).max(FIT_WEIGHT_KG_MAX),
});

export type SaveFitProfileBody = z.infer<typeof saveFitProfileSchema>;
