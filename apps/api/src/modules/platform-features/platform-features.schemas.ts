import { z } from "zod";

import { PLATFORM_FEATURE_KEYS } from "./platform-features.registry.js";

export const featureKeyParamsSchema = z.object({
  orgId: z.uuid(),
  key: z.enum(PLATFORM_FEATURE_KEYS),
});

export const orgIdParamsSchema = z.object({ orgId: z.uuid() });

export const setOverrideBodySchema = z.object({
  enabled: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  note: z.string().trim().min(1).max(500).nullable().optional(),
});

export type FeatureKeyParams = z.infer<typeof featureKeyParamsSchema>;
export type OrgIdParams = z.infer<typeof orgIdParamsSchema>;
export type SetOverrideBody = z.infer<typeof setOverrideBodySchema>;
