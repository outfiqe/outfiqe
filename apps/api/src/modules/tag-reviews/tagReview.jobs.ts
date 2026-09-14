import { DomainEvents, eventBus } from "#events/event-bus.js";
import { TagApprovalSource } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";

import { TAG_REVIEW_REMINDER_MIN_AGE_HOURS, TAG_REVIEW_SLA_DAYS } from "./tagReview.constants.js";
import { tagReviewRepository } from "./tagReview.repository.js";
import { applyTagApproval } from "./tagReview.service.js";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const runTagReviewSlaSweep = async (): Promise<{ approved: number }> => {
  const submittedBefore = new Date(Date.now() - TAG_REVIEW_SLA_DAYS * DAY_MS);
  const eligibleTags = await tagReviewRepository.listSlaEligibleTags(submittedBefore);

  let approvedCount = 0;
  for (const tag of eligibleTags) {
    const applied = await applyTagApproval(tag, {
      source: TagApprovalSource.SLA,
      reviewedById: null,
    });
    if (applied) approvedCount += 1;
  }

  if (approvedCount > 0) {
    logger.info(`Tag-review SLA sweep auto-approved ${approvedCount} tag(s)`);
  }
  return { approved: approvedCount };
};

export const runTagReviewReminderDigest = async (): Promise<{ brandsNotified: number }> => {
  const submittedBefore = new Date(Date.now() - TAG_REVIEW_REMINDER_MIN_AGE_HOURS * HOUR_MS);
  const backlogs = await tagReviewRepository.listBrandBacklogs(submittedBefore);

  for (const { brandId, pendingCount } of backlogs) {
    await eventBus.publish(DomainEvents.TAG_REVIEW_REMINDER_DUE, { brandId, pendingCount });
  }

  return { brandsNotified: backlogs.length };
};
