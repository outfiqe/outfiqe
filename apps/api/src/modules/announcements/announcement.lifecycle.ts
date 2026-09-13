import { AnnouncementStatus } from "#generated/prisma/enums.js";
import { settleIds } from "#lib/lifecycle-sweep.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { announcementRepository } from "./announcement.repository.js";
import { announcementService } from "./announcement.service.js";

const onDispatchError = (id: string, error: unknown): string =>
  `Announcement scheduled dispatch failed for ${id}: ${describeError(error)}`;

const dispatchDueAnnouncement = async (id: string): Promise<boolean> => {
  const claimed = await announcementRepository.claimForSending(id, AnnouncementStatus.SCHEDULED);
  if (!claimed) return false;

  await announcementService.runFanOut(id);
  return true;
};

export const runAnnouncementScheduledDispatch = async (): Promise<number> => {
  const dueIds = await announcementRepository.findDueScheduledIds(new Date());
  return settleIds(dueIds, dispatchDueAnnouncement, onDispatchError);
};
