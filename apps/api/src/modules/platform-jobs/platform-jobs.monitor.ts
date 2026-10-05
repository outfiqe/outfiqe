import * as Sentry from "@sentry/node";
import { differenceInMinutes } from "date-fns/differenceInMinutes";

import logger from "#lib/winston.utils.js";

import { OUTBOX_BACKLOG_ALERT } from "./platform-jobs.constants.js";
import { platformJobsRepository } from "./platform-jobs.repository.js";

const NOTHING_STUCK = 0;
const NO_WAIT_MINUTES = 0;

export type OutboxBacklogReport = {
  waitingCount: number;
  oldestWaitMinutes: number;
  stuckCount: number;
  isFallingBehind: boolean;
};

export const runOutboxBacklogCheck = async (): Promise<OutboxBacklogReport> => {
  const [waitingCount, oldestWaitingAt, stuckCount] = await Promise.all([
    platformJobsRepository.countUnpublished(),
    platformJobsRepository.findOldestUnpublishedAt(),
    platformJobsRepository.countStuck(),
  ]);
  const oldestWaitMinutes = oldestWaitingAt
    ? differenceInMinutes(new Date(), oldestWaitingAt)
    : NO_WAIT_MINUTES;
  const isFallingBehind =
    waitingCount > OUTBOX_BACKLOG_ALERT.MAX_WAITING_EVENTS ||
    oldestWaitMinutes > OUTBOX_BACKLOG_ALERT.MAX_OLDEST_WAIT_MINUTES;

  if (isFallingBehind) {
    logger.error(
      `The outbox is falling behind: ${waitingCount} events waiting, the oldest for ${oldestWaitMinutes} minutes`,
    );
    Sentry.captureMessage("The outbox is falling behind", {
      level: "error",
      extra: { waitingCount, oldestWaitMinutes },
    });
  }
  if (stuckCount > NOTHING_STUCK) {
    logger.warn(`${stuckCount} outbox events gave up after every retry`);
    Sentry.captureMessage("Outbox events gave up after every retry", {
      level: "warning",
      extra: { stuckCount },
    });
  }

  return { waitingCount, oldestWaitMinutes, stuckCount, isFallingBehind };
};
