import { isFuture } from "date-fns/isFuture";

import {
  AnnouncementStatus,
  NotificationEntityType,
  NotificationType,
} from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { notificationService } from "#modules/notifications/notification.service.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { describeError } from "#redis/redis.utils.js";

import {
  ANNOUNCEMENT_AUDIT_ACTION,
  ANNOUNCEMENT_AUDIT_TARGET_TYPE,
  ANNOUNCEMENT_FANOUT_PAGE_SIZE,
  ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS,
} from "./announcement.constants.js";
import { announcementRepository } from "./announcement.repository.js";
import type {
  AnnouncementListFilters,
  AnnouncementListResult,
  AnnouncementRecord,
  AnnouncementView,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "./announcement.types.js";
import {
  buildAnnouncementMetadata,
  resolveAudienceWhere,
  toAnnouncementView,
} from "./announcement.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const VALIDATION_STATUS = 422;
const NOT_FOUND_MESSAGE = "We couldn't find that announcement.";

const requireDraft = (record: AnnouncementRecord): void => {
  if (record.status !== AnnouncementStatus.DRAFT) {
    throw new AppError(
      "ANNOUNCEMENT_NOT_DRAFT",
      "This announcement can no longer be edited.",
      CONFLICT_STATUS,
    );
  }
};

const requireAnnouncement = async (id: string): Promise<AnnouncementRecord> => {
  const record = await announcementRepository.findById(id);
  if (!record) throw new AppError("NOT_FOUND", NOT_FOUND_MESSAGE, NOT_FOUND_STATUS);
  return record;
};

const resolveAudienceCount = async (record: AnnouncementRecord): Promise<number> =>
  announcementRepository.countAudience(
    resolveAudienceWhere(record.audiences, record.createdByAdminId),
  );

export const announcementService = {
  async createDraft(input: CreateAnnouncementInput): Promise<AnnouncementView> {
    const record = await announcementRepository.create(input);
    return toAnnouncementView(record, await resolveAudienceCount(record));
  },

  async updateDraft(id: string, input: UpdateAnnouncementInput): Promise<AnnouncementView> {
    const existing = await requireAnnouncement(id);
    requireDraft(existing);

    const record = await announcementRepository.update(id, input);
    return toAnnouncementView(record, await resolveAudienceCount(record));
  },

  async getById(id: string): Promise<AnnouncementView> {
    const record = await requireAnnouncement(id);
    return toAnnouncementView(record, await resolveAudienceCount(record));
  },

  async list(filters: AnnouncementListFilters): Promise<AnnouncementListResult> {
    const rows = await announcementRepository.list(filters);
    const hasMore = rows.length > filters.limit;
    const page = hasMore ? rows.slice(0, filters.limit) : rows;

    const announcements = await Promise.all(
      page.map(async (record) => toAnnouncementView(record, await resolveAudienceCount(record))),
    );
    return { announcements, nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null };
  },

  async send(id: string, scheduledAt: Date | null): Promise<AnnouncementView> {
    const existing = await requireAnnouncement(id);
    requireDraft(existing);

    const effectiveSendAt = scheduledAt ?? new Date();
    if (existing.expiresAt && existing.expiresAt <= effectiveSendAt) {
      throw new AppError(
        "EXPIRES_BEFORE_SEND",
        "This announcement's expiry is at or before its send time.",
        VALIDATION_STATUS,
      );
    }

    const resolvedAudienceCount = await resolveAudienceCount(existing);

    if (scheduledAt) {
      if (!isFuture(scheduledAt)) {
        throw new AppError(
          "SCHEDULE_IN_PAST",
          "Pick a send time in the future.",
          VALIDATION_STATUS,
        );
      }

      const scheduled = await announcementRepository.markScheduled(id, scheduledAt);
      await platformAudit.record({
        actorUserId: existing.createdByAdminId,
        action: ANNOUNCEMENT_AUDIT_ACTION.SCHEDULED,
        summary: `Scheduled the announcement "${existing.title}" for ~${resolvedAudienceCount} people`,
        targetType: ANNOUNCEMENT_AUDIT_TARGET_TYPE,
        targetId: id,
        metadata: {
          title: existing.title,
          audiences: existing.audiences,
          scheduledAt: scheduledAt.toISOString(),
          resolvedAudienceCount,
        },
      });
      return toAnnouncementView(scheduled, resolvedAudienceCount);
    }

    if (resolvedAudienceCount >= ANNOUNCEMENT_SEND_NOW_MAX_RECIPIENTS) {
      throw new AppError(
        "AUDIENCE_TOO_LARGE",
        "This audience is too large to send immediately — schedule it instead.",
        VALIDATION_STATUS,
      );
    }

    const claimed = await announcementRepository.claimForSending(id, AnnouncementStatus.DRAFT);
    if (!claimed) {
      throw new AppError(
        "ANNOUNCEMENT_NOT_DRAFT",
        "This announcement can no longer be sent.",
        CONFLICT_STATUS,
      );
    }
    return announcementService.runFanOut(id);
  },

  async cancel(id: string, actorUserId: string): Promise<void> {
    const canceled = await announcementRepository.cancel(id);
    if (!canceled) {
      throw new AppError(
        "ANNOUNCEMENT_NOT_CANCELABLE",
        "This announcement has already started sending and can't be canceled.",
        CONFLICT_STATUS,
      );
    }

    await platformAudit.record({
      actorUserId,
      action: ANNOUNCEMENT_AUDIT_ACTION.CANCELED,
      summary: "Canceled a scheduled announcement",
      targetType: ANNOUNCEMENT_AUDIT_TARGET_TYPE,
      targetId: id,
    });
  },

  async runFanOut(id: string): Promise<AnnouncementView> {
    const announcement = await requireAnnouncement(id);
    const where = resolveAudienceWhere(announcement.audiences, announcement.createdByAdminId);
    const metadata = buildAnnouncementMetadata(announcement);

    let sentCount = 0;
    let cursor: string | undefined;
    for (;;) {
      const page = await announcementRepository.findAudiencePage(where, {
        cursor,
        limit: ANNOUNCEMENT_FANOUT_PAGE_SIZE,
      });
      if (page.ids.length === 0) break;

      try {
        sentCount += await notificationService.notifyBroadcast({
          type: NotificationType.ANNOUNCEMENT,
          entityType: NotificationEntityType.ANNOUNCEMENT,
          entityId: id,
          metadata,
          recipientIds: page.ids,
        });
      } catch (error) {
        logger.error(`Announcement fan-out page failed for ${id}: ${describeError(error)}`);
      }

      if (!page.nextCursor) break;
      cursor = page.nextCursor;
    }

    const sent = await announcementRepository.markSent(id, sentCount);
    await platformAudit.record({
      actorUserId: announcement.createdByAdminId,
      action: ANNOUNCEMENT_AUDIT_ACTION.SENT,
      summary: `Sent the announcement "${announcement.title}" to ${sentCount} people`,
      targetType: ANNOUNCEMENT_AUDIT_TARGET_TYPE,
      targetId: id,
      metadata: {
        title: announcement.title,
        body: announcement.body,
        audiences: announcement.audiences,
        recipientCount: sentCount,
      },
    });

    return toAnnouncementView(sent, sentCount);
  },
};
