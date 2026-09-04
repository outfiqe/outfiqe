import { z } from "zod";

import { PushPlatform } from "#generated/prisma/enums.js";

import {
  MAX_PUSH_ENDPOINT_LENGTH,
  MAX_PUSH_KEY_LENGTH,
  MAX_USER_AGENT_LENGTH,
} from "./push.constants.js";

export const savePushSubscriptionSchema = z.object({
  endpoint: z.url().max(MAX_PUSH_ENDPOINT_LENGTH),
  keys: z.object({
    p256dh: z.string().min(1).max(MAX_PUSH_KEY_LENGTH),
    auth: z.string().min(1).max(MAX_PUSH_KEY_LENGTH),
  }),
  platform: z.enum(PushPlatform).optional(),
  userAgent: z.string().max(MAX_USER_AGENT_LENGTH).optional(),
});

export type SavePushSubscriptionBody = z.infer<typeof savePushSubscriptionSchema>;

export const removePushSubscriptionSchema = z.object({
  endpoint: z.url().max(MAX_PUSH_ENDPOINT_LENGTH),
});

export type RemovePushSubscriptionBody = z.infer<typeof removePushSubscriptionSchema>;
