import { z } from "zod";

export const FEATURE_ROLLOUTS = ["OFF", "ALLOW_LIST", "EVERYONE"] as const;

const allowListedUserSchema = z.object({ id: z.string(), name: z.string(), handle: z.string() });

const allowListedBrandSchema = z.object({ id: z.string(), name: z.string() });

export const featureSwitchSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  rollout: z.enum(FEATURE_ROLLOUTS),
  allowedUserIds: z.array(z.string()),
  allowedBrandIds: z.array(z.string()),
  allowedUsers: z.array(allowListedUserSchema),
  allowedBrands: z.array(allowListedBrandSchema),
  updatedAt: z.string().nullable(),
});

export const featureSwitchListSchema = z.array(featureSwitchSchema);

export type FeatureSwitch = z.infer<typeof featureSwitchSchema>;
export type AllowListedUser = z.infer<typeof allowListedUserSchema>;
export type AllowListedBrand = z.infer<typeof allowListedBrandSchema>;
export type FeatureRollout = FeatureSwitch["rollout"];
export type FeatureSwitchSettings = Pick<
  FeatureSwitch,
  "rollout" | "allowedUserIds" | "allowedBrandIds"
>;
