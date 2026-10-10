import { z } from "zod";

export const AnnouncementAudience = {
  EVERYONE: "EVERYONE",
  CUSTOMERS: "CUSTOMERS",
  APPROVED_CREATORS: "APPROVED_CREATORS",
  BRAND_OWNERS: "BRAND_OWNERS",
  STAFF: "STAFF",
} as const;
export const announcementAudienceSchema = z.enum(AnnouncementAudience);
export type AnnouncementAudienceValue = z.infer<typeof announcementAudienceSchema>;

export const AnnouncementStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  SENDING: "SENDING",
  SENT: "SENT",
  CANCELED: "CANCELED",
} as const;
export const announcementStatusSchema = z.enum(AnnouncementStatus);
export type AnnouncementStatusValue = z.infer<typeof announcementStatusSchema>;

export const NotificationSurface = {
  WEB: "WEB",
  ADMIN: "ADMIN",
} as const;
export const notificationSurfaceSchema = z.enum(NotificationSurface);
export type NotificationSurfaceValue = z.infer<typeof notificationSurfaceSchema>;

export const announcementSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  audiences: z.array(announcementAudienceSchema),
  targetSurface: notificationSurfaceSchema.nullable(),
  targetPath: z.string().nullable(),
  expiresAt: z.string().nullable(),
  scheduledAt: z.string().nullable(),
  sentAt: z.string().nullable(),
  status: announcementStatusSchema,
  recipientCount: z.number().nullable(),
  createdByAdminId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAudienceCount: z.number(),
});
export type Announcement = z.infer<typeof announcementSchema>;

export const announcementPageSchema = z.object({
  announcements: z.array(announcementSchema),
  nextCursor: z.string().nullable(),
});
export type AnnouncementPage = z.infer<typeof announcementPageSchema>;

export type AnnouncementFormInput = {
  title: string;
  body: string;
  audiences: AnnouncementAudienceValue[];
  targetSurface?: NotificationSurfaceValue | null;
  targetPath?: string | null;
  expiresAt?: string | null;
};

export type SendAnnouncementInput = {
  scheduledAt?: string;
};
