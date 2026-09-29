import { z } from "zod";

import { FeatureFlagRollout } from "#generated/prisma/enums.js";

import { MAX_FEATURE_FLAG_ALLOW_LIST_SIZE } from "./feature-flags.constants.js";
import { FEATURE_FLAG_KEYS } from "./feature-flags.registry.js";

export const featureFlagKeyParamsSchema = z.object({ key: z.enum(FEATURE_FLAG_KEYS) });

export const updateFeatureFlagBodySchema = z
  .object({
    rollout: z.enum(FeatureFlagRollout),
    allowedUserIds: z.array(z.uuid()).max(MAX_FEATURE_FLAG_ALLOW_LIST_SIZE),
    allowedBrandIds: z.array(z.uuid()).max(MAX_FEATURE_FLAG_ALLOW_LIST_SIZE),
  })
  .strict();

export type FeatureFlagKeyParams = z.infer<typeof featureFlagKeyParamsSchema>;
export type UpdateFeatureFlagBody = z.infer<typeof updateFeatureFlagBodySchema>;
