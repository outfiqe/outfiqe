import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { OUTBOX_QUEUE_NAME } from "#outbox/outbox.constants.js";
import { getOutboxQueue } from "#outbox/outbox.queues.js";
import type { OutboxQueueName } from "#outbox/outbox.types.js";
import { describeError } from "#redis/redis.utils.js";

import {
  PLATFORM_JOBS_AUDIT_TARGET_TYPE,
  PLATFORM_JOBS_LIMITS,
} from "./platform-jobs.constants.js";
import { platformJobsRepository } from "./platform-jobs.repository.js";
import type { JobsHealth, QueueHealth } from "./platform-jobs.types.js";

const NOT_FOUND_STATUS = 404;
const SERVICE_UNAVAILABLE_STATUS = 503;
const NO_JOBS = 0;
const FIRST_FAILED_JOB_INDEX = 0;
const LAST_FAILED_JOB_INDEX = PLATFORM_JOBS_LIMITS.FAILED_JOBS_RETRIED_PER_REQUEST - 1;

const readQueueHealth = async (name: OutboxQueueName): Promise<QueueHealth> => {
  try {
    const counts = await getOutboxQueue(name).getJobCounts(
      "waiting",
      "active",
      "delayed",
      "failed",
    );
    return {
      name,
      isReachable: true,
      waiting: counts.waiting ?? NO_JOBS,
      active: counts.active ?? NO_JOBS,
      delayed: counts.delayed ?? NO_JOBS,
      failed: counts.failed ?? NO_JOBS,
    };
  } catch (error) {
    logger.warn(`Jobs screen could not read queue ${name}: ${describeError(error)}`);
    return {
      name,
      isReachable: false,
      waiting: NO_JOBS,
      active: NO_JOBS,
      delayed: NO_JOBS,
      failed: NO_JOBS,
    };
  }
};

export const platformJobsService = {
  async getHealth(): Promise<JobsHealth> {
    const [unpublishedCount, oldestUnpublishedAt, stuckCount, stuckRows, queues] =
      await Promise.all([
        platformJobsRepository.countUnpublished(),
        platformJobsRepository.findOldestUnpublishedAt(),
        platformJobsRepository.countStuck(),
        platformJobsRepository.listStuck(),
        Promise.all(Object.values(OUTBOX_QUEUE_NAME).map(readQueueHealth)),
      ]);
    return {
      outbox: {
        unpublishedCount,
        oldestUnpublishedAt: oldestUnpublishedAt?.toISOString() ?? null,
        stuckCount,
      },
      stuckEvents: stuckRows.map(({ createdAt, ...event }) => ({
        ...event,
        createdAt: createdAt.toISOString(),
      })),
      queues,
    };
  },

  async retryOutboxEvent(adminUserId: string, eventId: string): Promise<void> {
    const isReset = await platformJobsRepository.resetStuckEvent(eventId);
    if (!isReset) {
      throw new AppError(
        "OUTBOX_EVENT_NOT_FOUND",
        "That event was already sent or no longer exists.",
        NOT_FOUND_STATUS,
      );
    }
    await platformAudit.record({
      actorUserId: adminUserId,
      action: PLATFORM_AUDIT_ACTION.OUTBOX_EVENT_RETRIED,
      summary: "Sent a stuck background event again",
      targetType: PLATFORM_JOBS_AUDIT_TARGET_TYPE.OUTBOX_EVENT,
      targetId: eventId,
    });
  },

  async retryFailedJobs(
    adminUserId: string,
    queueName: OutboxQueueName,
  ): Promise<{ retriedCount: number }> {
    let failedJobs;
    try {
      failedJobs = await getOutboxQueue(queueName).getFailed(
        FIRST_FAILED_JOB_INDEX,
        LAST_FAILED_JOB_INDEX,
      );
    } catch (error) {
      logger.error(`Retrying failed jobs on ${queueName} failed: ${describeError(error)}`);
      throw new AppError(
        "QUEUE_UNAVAILABLE",
        "The job queue can't be reached right now. Try again shortly.",
        SERVICE_UNAVAILABLE_STATUS,
      );
    }
    await Promise.all(failedJobs.map((job) => job.retry()));
    await platformAudit.record({
      actorUserId: adminUserId,
      action: PLATFORM_AUDIT_ACTION.QUEUE_FAILED_JOBS_RETRIED,
      summary: `Retried ${failedJobs.length} failed jobs on ${queueName}`,
      targetType: PLATFORM_JOBS_AUDIT_TARGET_TYPE.QUEUE,
      targetId: queueName,
      metadata: { retriedCount: failedJobs.length },
    });
    return { retriedCount: failedJobs.length };
  },
};
