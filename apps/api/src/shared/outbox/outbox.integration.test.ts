import { randomUUID } from "node:crypto";

import { subDays } from "date-fns/subDays";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { redis } from "#redis/redis.client.js";

import {
  OUTBOX_MAX_PUBLISH_ATTEMPTS,
  OUTBOX_QUEUE_NAME,
  OUTBOX_RETENTION_DAYS,
  OUTBOX_TOPIC,
} from "./outbox.constants.js";
import { registerOutboxHandler } from "./outbox.handlers.js";
import { closeOutboxQueues, getOutboxQueue } from "./outbox.queues.js";
import { enqueueOutboxEvent, runOutboxRelay, runOutboxRetentionSweep } from "./outbox.service.js";
import type { OutboxJobData } from "./outbox.types.js";
import { startOutboxWorkers, stopOutboxWorkers } from "./outbox.workers.js";

const PENDING_EVENT_COUNT = 10;
const HANDLER_WAIT_TIMEOUT_MS = 5_000;
const HANDLER_POLL_INTERVAL_MS = 50;
const DAYS_PAST_RETENTION = OUTBOX_RETENTION_DAYS + 1;
const SINGLE_ATTEMPT = 1;
const FAILED_JOB_STATE = "failed";
const COMPLETED_JOB_STATE = "completed";

const enqueueStockChanged = (aggregateId = randomUUID()) =>
  prisma.$transaction((tx) =>
    enqueueOutboxEvent(tx, {
      topic: OUTBOX_TOPIC.STOCK_CHANGED,
      aggregateId,
      payload: { sizeIds: [randomUUID()] },
    }),
  );

const inventoryQueue = () => getOutboxQueue(OUTBOX_QUEUE_NAME.INVENTORY);

const waitUntil = async (condition: () => boolean | Promise<boolean>): Promise<void> => {
  const deadline = Date.now() + HANDLER_WAIT_TIMEOUT_MS;
  while (!(await condition())) {
    if (Date.now() > deadline) throw new Error("Timed out waiting for the outbox worker");
    await new Promise((resolve) => setTimeout(resolve, HANDLER_POLL_INTERVAL_MS));
  }
};

const waitForJobState = (jobId: string, expectedState: string) =>
  waitUntil(async () => (await inventoryQueue().getJobState(jobId)) === expectedState);

beforeEach(async () => {
  await redis.flushdb();
});

afterEach(async () => {
  await stopOutboxWorkers();
});

afterAll(async () => {
  await closeOutboxQueues();
});

describe("enqueueOutboxEvent", () => {
  it("disappears together with the transaction that wrote it when that transaction fails", async () => {
    const failingWrite = prisma.$transaction(async (tx) => {
      await enqueueOutboxEvent(tx, {
        topic: OUTBOX_TOPIC.STOCK_CHANGED,
        aggregateId: randomUUID(),
        payload: {},
      });
      throw new Error("business write failed");
    });

    await expect(failingWrite).rejects.toThrow("business write failed");
    expect(await prisma.outboxEvent.count()).toBe(0);
  });
});

describe("runOutboxRelay", () => {
  it("adds each pending event to its queue under the event's own id and marks it published", async () => {
    await enqueueStockChanged();
    const [pendingEvent] = await prisma.outboxEvent.findMany();

    const summary = await runOutboxRelay();

    expect(summary).toEqual({ published: 1, failed: 0 });
    const publishedEvent = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: pendingEvent!.id },
    });
    expect(publishedEvent.publishedAt).not.toBeNull();
    const job = await inventoryQueue().getJob(pendingEvent!.id);
    expect(job?.name).toBe(OUTBOX_TOPIC.STOCK_CHANGED);
    expect(job?.data.outboxEventId).toBe(pendingEvent!.id);
  });

  it("never publishes the same event twice when two relays run at the same time", async () => {
    for (let index = 0; index < PENDING_EVENT_COUNT; index += 1) await enqueueStockChanged();

    const summaries = await Promise.all([runOutboxRelay(), runOutboxRelay()]);

    const totalPublished = summaries.reduce((total, { published }) => total + published, 0);
    expect(totalPublished).toBe(PENDING_EVENT_COUNT);
    expect(await inventoryQueue().count()).toBe(PENDING_EVENT_COUNT);
    expect(await prisma.outboxEvent.count({ where: { publishedAt: null } })).toBe(0);
  });

  it("does nothing on a second run once everything is published", async () => {
    await enqueueStockChanged();
    await runOutboxRelay();

    expect(await runOutboxRelay()).toEqual({ published: 0, failed: 0 });
  });

  it("records the failure and keeps the event pending when it can't be published", async () => {
    const orphanEvent = await prisma.outboxEvent.create({
      data: { topic: "topic.nobody.routes", aggregateId: randomUUID(), payload: {} },
    });

    const summary = await runOutboxRelay();

    expect(summary).toEqual({ published: 0, failed: 1 });
    const failedEvent = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: orphanEvent.id },
    });
    expect(failedEvent.publishedAt).toBeNull();
    expect(failedEvent.attempts).toBe(1);
    expect(failedEvent.lastError).toContain("topic.nobody.routes");
  });

  it("stops retrying an event once it has used up its publish attempts", async () => {
    await prisma.outboxEvent.create({
      data: {
        topic: "topic.nobody.routes",
        aggregateId: randomUUID(),
        payload: {},
        attempts: OUTBOX_MAX_PUBLISH_ATTEMPTS,
      },
    });

    expect(await runOutboxRelay()).toEqual({ published: 0, failed: 0 });
  });
});

describe("runOutboxRetentionSweep", () => {
  it("deletes published events past the retention window and keeps everything else", async () => {
    await enqueueStockChanged();
    await enqueueStockChanged();
    await enqueueStockChanged();
    const [oldPublished, recentPublished, unpublished] = await prisma.outboxEvent.findMany({
      orderBy: { createdAt: "asc" },
    });
    await prisma.outboxEvent.update({
      where: { id: oldPublished!.id },
      data: { publishedAt: subDays(new Date(), DAYS_PAST_RETENTION) },
    });
    await prisma.outboxEvent.update({
      where: { id: recentPublished!.id },
      data: { publishedAt: new Date() },
    });

    const { deleted } = await runOutboxRetentionSweep();

    expect(deleted).toBe(1);
    const remainingIds = (await prisma.outboxEvent.findMany({ select: { id: true } })).map(
      ({ id }) => id,
    );
    expect(remainingIds.sort()).toEqual([recentPublished!.id, unpublished!.id].sort());
  });
});

describe("outbox workers", () => {
  it("run the registered handler for a relayed event", async () => {
    const handledJobs: OutboxJobData[] = [];
    const unregister = registerOutboxHandler(OUTBOX_TOPIC.STOCK_CHANGED, async (job) => {
      handledJobs.push(job);
    });
    startOutboxWorkers([OUTBOX_QUEUE_NAME.INVENTORY]);
    const aggregateId = randomUUID();

    try {
      await enqueueStockChanged(aggregateId);
      await runOutboxRelay();
      await waitUntil(() => handledJobs.length > 0);
    } finally {
      unregister();
    }

    expect(handledJobs).toHaveLength(1);
    expect(handledJobs[0]?.aggregateId).toBe(aggregateId);
  });

  it("keep a job in the failed set once its handler has failed on every attempt", async () => {
    const unregister = registerOutboxHandler(OUTBOX_TOPIC.STOCK_CHANGED, async () => {
      throw new Error("stock watcher crashed");
    });
    startOutboxWorkers([OUTBOX_QUEUE_NAME.INVENTORY]);
    const jobId = randomUUID();

    try {
      await inventoryQueue().add(
        OUTBOX_TOPIC.STOCK_CHANGED,
        { outboxEventId: jobId, aggregateId: randomUUID(), payload: {} },
        { jobId, attempts: SINGLE_ATTEMPT },
      );
      await waitForJobState(jobId, FAILED_JOB_STATE);
    } finally {
      unregister();
    }

    const failedJob = await inventoryQueue().getJob(jobId);
    expect(failedJob?.failedReason).toBe("stock watcher crashed");
  });

  it("complete a job for a topic nobody handles without doing anything", async () => {
    startOutboxWorkers([OUTBOX_QUEUE_NAME.INVENTORY]);
    const jobId = randomUUID();

    await inventoryQueue().add(
      "topic.nobody.routes",
      { outboxEventId: jobId, aggregateId: randomUUID(), payload: {} },
      { jobId },
    );

    await waitForJobState(jobId, COMPLETED_JOB_STATE);
  });

  it("refuse a second handler for the same topic", () => {
    const unregister = registerOutboxHandler(OUTBOX_TOPIC.STOCK_CHANGED, async () => {});
    try {
      expect(() => registerOutboxHandler(OUTBOX_TOPIC.STOCK_CHANGED, async () => {})).toThrow(
        /already registered/,
      );
    } finally {
      unregister();
    }
  });
});
