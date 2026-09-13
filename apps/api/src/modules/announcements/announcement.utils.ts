import type { Prisma } from "#generated/prisma/client.js";
import { AnnouncementAudience, CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import type { NotificationMetadata } from "#modules/notifications/notification.types.js";

import type { AnnouncementRecord, AnnouncementView } from "./announcement.types.js";

const AUDIENCE_WHERE: Record<AnnouncementAudience, Prisma.UserWhereInput> = {
  [AnnouncementAudience.EVERYONE]: {},
  [AnnouncementAudience.CUSTOMERS]: { role: UserRole.CUSTOMER },
  [AnnouncementAudience.APPROVED_CREATORS]: {
    isCreator: true,
    creatorStatus: CreatorStatus.APPROVED,
  },
  [AnnouncementAudience.BRAND_OWNERS]: { role: UserRole.BRAND_OWNER },
  [AnnouncementAudience.STAFF]: { role: UserRole.ADMIN },
};

export const resolveAudienceWhere = (
  audiences: AnnouncementAudience[],
  excludeAdminId: string,
): Prisma.UserWhereInput => {
  const matchesEveryone = audiences.includes(AnnouncementAudience.EVERYONE);
  const segmentWhere: Prisma.UserWhereInput = matchesEveryone
    ? {}
    : { OR: audiences.map((audience) => AUDIENCE_WHERE[audience]) };

  return { ...segmentWhere, id: { not: excludeAdminId } };
};

type AnnouncementWithAudiences = Prisma.AnnouncementGetPayload<{
  include: { audiences: true };
}>;

export const toAnnouncementRecord = (row: AnnouncementWithAudiences): AnnouncementRecord => ({
  id: row.id,
  title: row.title,
  body: row.body,
  audiences: row.audiences.map((target) => target.audience),
  targetSurface: row.targetSurface,
  targetPath: row.targetPath,
  expiresAt: row.expiresAt,
  scheduledAt: row.scheduledAt,
  sentAt: row.sentAt,
  status: row.status,
  recipientCount: row.recipientCount,
  createdByAdminId: row.createdByAdminId,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toAnnouncementView = (
  record: AnnouncementRecord,
  resolvedAudienceCount: number,
): AnnouncementView => ({
  ...record,
  expiresAt: record.expiresAt?.toISOString() ?? null,
  scheduledAt: record.scheduledAt?.toISOString() ?? null,
  sentAt: record.sentAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
  resolvedAudienceCount,
});

export const buildAnnouncementMetadata = (record: AnnouncementRecord): NotificationMetadata => ({
  announcementTitle: record.title,
  announcementBody: record.body,
  announcementTargetSurface: record.targetSurface,
  announcementTargetPath: record.targetPath,
  announcementExpiresAt: record.expiresAt?.toISOString() ?? null,
});
