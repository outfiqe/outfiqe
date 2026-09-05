import { z } from "zod";

import { NotificationType } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

export const listNotificationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const notificationIdParamSchema = z.object({
  id: z.uuid(),
});

export const notificationPreferenceTypeParamSchema = z.object({
  type: z.enum(NotificationType),
});

export const updateNotificationPreferenceBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    pushEnabled: z.boolean().optional(),
  })
  .refine((body) => body.enabled !== undefined || body.pushEnabled !== undefined, {
    message: "Provide enabled, pushEnabled, or both.",
  });

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type NotificationIdParam = z.infer<typeof notificationIdParamSchema>;
export type NotificationPreferenceTypeParam = z.infer<typeof notificationPreferenceTypeParamSchema>;
export type UpdateNotificationPreferenceBody = z.infer<
  typeof updateNotificationPreferenceBodySchema
>;
