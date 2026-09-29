import type { Prisma } from "#generated/prisma/client.js";

import type { OUTBOX_QUEUE_NAME, OUTBOX_TOPIC } from "./outbox.constants.js";

export type OutboxTopic = (typeof OUTBOX_TOPIC)[keyof typeof OUTBOX_TOPIC];

export type OutboxQueueName = (typeof OUTBOX_QUEUE_NAME)[keyof typeof OUTBOX_QUEUE_NAME];

export type OutboxEventInput = {
  topic: OutboxTopic;
  aggregateId: string;
  payload: Prisma.InputJsonValue;
};

export type OutboxJobData = {
  outboxEventId: string;
  aggregateId: string;
  payload: Prisma.JsonValue;
};

export type OutboxJobHandler = (job: OutboxJobData) => Promise<void>;

export type PendingOutboxRow = {
  id: string;
  topic: string;
  aggregateId: string;
  payload: Prisma.JsonValue;
};

export type OutboxRelaySummary = { published: number; failed: number };
