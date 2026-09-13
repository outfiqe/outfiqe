import { isFuture } from "date-fns/isFuture";
import { z } from "zod";

import {
  AnnouncementAudience,
  AnnouncementStatus,
  NotificationSurface,
} from "#generated/prisma/enums.js";

import {
  ANNOUNCEMENT_BODY_MAX_LENGTH,
  ANNOUNCEMENT_TARGET_PATH_MAX_LENGTH,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./announcement.constants.js";

const EXTERNAL_URL_PATTERN = /^https:\/\//;

const ctaFieldsAreConsistent = (data: {
  targetSurface?: NotificationSurface | null;
  targetPath?: string | null;
}): boolean => {
  if (!data.targetPath) return !data.targetSurface;
  return data.targetSurface
    ? !EXTERNAL_URL_PATTERN.test(data.targetPath)
    : EXTERNAL_URL_PATTERN.test(data.targetPath);
};

const CTA_MISMATCH_MESSAGE =
  "Provide targetSurface with a relative targetPath for an internal link, an https:// targetPath alone for an external link, or neither for no call-to-action.";

const announcementBodySchema = z
  .object({
    title: z.string().trim().min(1).max(ANNOUNCEMENT_TITLE_MAX_LENGTH),
    body: z.string().trim().min(1).max(ANNOUNCEMENT_BODY_MAX_LENGTH),
    audiences: z.array(z.enum(AnnouncementAudience)).min(1),
    targetSurface: z.enum(NotificationSurface).nullable().optional(),
    targetPath: z
      .string()
      .trim()
      .min(1)
      .max(ANNOUNCEMENT_TARGET_PATH_MAX_LENGTH)
      .nullable()
      .optional(),
    expiresAt: z.coerce.date().nullable().optional(),
  })
  .refine(ctaFieldsAreConsistent, { message: CTA_MISMATCH_MESSAGE, path: ["targetPath"] })
  .refine((data) => !data.expiresAt || isFuture(data.expiresAt), {
    message: "expiresAt must be in the future.",
    path: ["expiresAt"],
  });

export const createAnnouncementSchema = announcementBodySchema;
export const updateAnnouncementSchema = announcementBodySchema;

export const sendAnnouncementSchema = z
  .object({ scheduledAt: z.coerce.date().optional() })
  .refine((data) => !data.scheduledAt || isFuture(data.scheduledAt), {
    message: "scheduledAt must be in the future.",
    path: ["scheduledAt"],
  });

export const listAnnouncementsQuerySchema = z.object({
  status: z.enum(AnnouncementStatus).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const announcementIdParamSchema = z.object({ id: z.uuid() });

export type CreateAnnouncementBody = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementBody = z.infer<typeof updateAnnouncementSchema>;
export type SendAnnouncementBody = z.infer<typeof sendAnnouncementSchema>;
export type ListAnnouncementsQuery = z.infer<typeof listAnnouncementsQuerySchema>;
export type AnnouncementIdParam = z.infer<typeof announcementIdParamSchema>;
