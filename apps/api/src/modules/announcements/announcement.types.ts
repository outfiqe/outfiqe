import type {
  AnnouncementAudience,
  AnnouncementStatus,
  NotificationSurface,
} from "#generated/prisma/enums.js";

export type AnnouncementRecord = {
  id: string;
  title: string;
  body: string;
  audiences: AnnouncementAudience[];
  targetSurface: NotificationSurface | null;
  targetPath: string | null;
  expiresAt: Date | null;
  scheduledAt: Date | null;
  sentAt: Date | null;
  status: AnnouncementStatus;
  recipientCount: number | null;
  createdByAdminId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AnnouncementView = Omit<
  AnnouncementRecord,
  "expiresAt" | "scheduledAt" | "sentAt" | "createdAt" | "updatedAt"
> & {
  expiresAt: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAudienceCount: number;
};

export type AnnouncementCtaInput = {
  targetSurface: NotificationSurface | null;
  targetPath: string | null;
};

export type CreateAnnouncementInput = AnnouncementCtaInput & {
  title: string;
  body: string;
  audiences: AnnouncementAudience[];
  expiresAt: Date | null;
  createdByAdminId: string;
};

export type UpdateAnnouncementInput = AnnouncementCtaInput & {
  title: string;
  body: string;
  audiences: AnnouncementAudience[];
  expiresAt: Date | null;
};

export type AnnouncementListFilters = {
  status?: AnnouncementStatus;
  cursor?: string;
  limit: number;
};

export type AnnouncementListResult = {
  announcements: AnnouncementView[];
  nextCursor: string | null;
};

export type AudiencePage = {
  ids: string[];
  nextCursor: string | null;
};
