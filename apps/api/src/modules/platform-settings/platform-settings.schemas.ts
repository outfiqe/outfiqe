import { z } from "zod";

import { PLATFORM_SETTING_KEYS } from "./platform-settings.registry.js";

export const settingKeyParamsSchema = z.object({ key: z.enum(PLATFORM_SETTING_KEYS) });

export const updateSettingBodySchema = z.object({ value: z.number() }).strict();

export type SettingKeyParams = z.infer<typeof settingKeyParamsSchema>;
export type UpdateSettingBody = z.infer<typeof updateSettingBodySchema>;
