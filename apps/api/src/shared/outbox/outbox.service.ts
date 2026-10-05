import * as Sentry from "@sentry/node";
import { subDays } from "date-fns/subDays";

import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import {
  OUTBOX_MAX_PUBLISH_ATTEMPTS,
  OUTBOX_RELAY_BATCH_SIZE,
  OUTBOX_RELAY_TRANSACTION_TIMEOUT_MS,
  OUTBOX_RETENTION_DAYS,
  OUTBOX_RETENTION_DELETE_BATCH_SIZE,
} from "./outbox.constants.js";
import { addOutboxJob } from "./outbox.queues.js";
import type { OutboxEventInput, OutboxRelaySummary, PendingOutboxRow } from "./outbox.types.js";
import { isOutboxTopic, truncateOutboxError } from "./outbox.utils.js";

export const enqueueOutboxEvent = async (
  tx: Prisma.TransactionClient,
  { topic, aggregateId, payload }: OutboxEventInput,
): Promise<void> => {
  await tx.outboxEvent.create({ data: { topic, aggregateId, payload } });
};

const publishPendingRow = async ({ id, topic, aggregateId, payload }: PendingOutboxRow) => {
  if (!isOutboxTopic(topic)) {
    throw new Error(`No queue is configured for outbox topic "${topic}"`);
  }
  await addOutboxJob(topic, id, { outboxEventId: id, aggregateId, payload });
};

const recordPublishFailure = async (
  tx: Prisma.TransactionClient,
  pendingRow: PendingOutboxRow,
  error: unknown,
): Promise<void> => {
  const errorDescription = describeError(error);
  await tx.outboxEvent.update({
    where: { id: pendingRow.id },
    data: { attempts: { increment: 1 }, lastError: truncateOutboxError(errorDescription) },
  });
  logger.error(
    `Outbox relay could not publish ${pendingRow.topic}/${pendingRow.id}: ${errorDescription}`,
  );
  Sentry.captureException(error, { extra: { outboxEventId: pendingRow.id } });
};

export const runOutboxRelay = async (): Promise<OutboxRelaySummary> =>
  prisma.$transaction(
    async (tx) => {
      const pendingRows = await tx.$queryRaw<PendingOutboxRow[]>`
        SELECT "id", "topic", "aggregate_id" AS "aggregateId", "payload"
        FROM "outbox_events"
        WHERE "published_at" IS NULL AND "attempts" < ${OUTBOX_MAX_PUBLISH_ATTEMPTS}
        ORDER BY "created_at"
        LIMIT ${OUTBOX_RELAY_BATCH_SIZE}
        FOR UPDATE SKIP LOCKED`;

      const publishedIds: string[] = [];
      for (const pendingRow of pendingRows) {
        try {
          await publishPendingRow(pendingRow);
          publishedIds.push(pendingRow.id);
        } catch (error) {
          await recordPublishFailure(tx, pendingRow, error);
        }
      }

      if (publishedIds.length > 0) {
        await tx.outboxEvent.updateMany({
          where: { id: { in: publishedIds } },
          data: { publishedAt: new Date() },
        });
      }

      return { published: publishedIds.length, failed: pendingRows.length - publishedIds.length };
    },
    { timeout: OUTBOX_RELAY_TRANSACTION_TIMEOUT_MS },
  );

export const runOutboxRetentionSweep = async (): Promise<{ deleted: number }> => {
  const cutoff = subDays(new Date(), OUTBOX_RETENTION_DAYS);
  let deleted = 0;

  for (;;) {
    const deletedInBatch = await prisma.$executeRaw`
      DELETE FROM "outbox_events"
      WHERE "id" IN (
        SELECT "id" FROM "outbox_events"
        WHERE "published_at" < ${cutoff}
        LIMIT ${OUTBOX_RETENTION_DELETE_BATCH_SIZE}
      )`;
    deleted += deletedInBatch;
    if (deletedInBatch < OUTBOX_RETENTION_DELETE_BATCH_SIZE) return { deleted };
  }
};
