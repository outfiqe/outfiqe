import type { OutboxQueueName } from "#outbox/outbox.types.js";

export type StuckOutboxEvent = {
  id: string;
  topic: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
};

export type QueueHealth = {
  name: OutboxQueueName;
  isReachable: boolean;
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
};

export type JobsHealth = {
  outbox: {
    unpublishedCount: number;
    oldestUnpublishedAt: string | null;
    stuckCount: number;
  };
  stuckEvents: StuckOutboxEvent[];
  queues: QueueHealth[];
  queueDashboardPath: string;
};
