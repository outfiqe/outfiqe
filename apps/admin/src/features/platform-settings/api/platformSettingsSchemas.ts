import { z } from "zod";

export const platformSettingSchema = z.object({
  key: z.string(),
  label: z.string(),
  description: z.string(),
  group: z.string(),
  defaultValue: z.number(),
  minimum: z.number(),
  maximum: z.number(),
  value: z.number(),
  isOverridden: z.boolean(),
  updatedAt: z.string().nullable(),
});

export const platformSettingListSchema = z.array(platformSettingSchema);

export type PlatformSetting = z.infer<typeof platformSettingSchema>;
