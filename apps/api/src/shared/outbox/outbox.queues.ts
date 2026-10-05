import { Queue } from "bullmq";

import { env } from "#config/env.config.js";

import {
  OUTBOX_COMPLETED_JOBS_KEPT,
  OUTBOX_JOB_ATTEMPTS,
  OUTBOX_JOB_BACKOFF_DELAY_MS,
  OUTBOX_JOB_BACKOFF_STRATEGY,
  OUTBOX_QUEUE_NAME,
} from "./outbox.constants.js";
import type { OutboxJobData, OutboxQueueName, OutboxTopic } from "./outbox.types.js";
import { queueNameForOutboxTopic, toQueueConnectionOptions } from "./outbox.utils.js";

const PRODUCER_MAX_RETRIES_PER_REQUEST = 1;

const producerConnection = () =>
  toQueueConnectionOptions(env.REDIS_URL, {
    maxRetriesPerRequest: PRODUCER_MAX_RETRIES_PER_REQUEST,
    enableOfflineQueue: false,
  });

export const workerConnection = () =>
  toQueueConnectionOptions(env.REDIS_URL, { maxRetriesPerRequest: null });

const openQueues = new Map<OutboxQueueName, Queue<OutboxJobData>>();

export const getOutboxQueue = (queueName: OutboxQueueName): Queue<OutboxJobData> => {
  const existingQueue = openQueues.get(queueName);
  if (existingQueue) return existingQueue;

  const queue = new Queue<OutboxJobData>(queueName, {
    connection: producerConnection(),
    defaultJobOptions: {
      attempts: OUTBOX_JOB_ATTEMPTS,
      backoff: { type: OUTBOX_JOB_BACKOFF_STRATEGY, delay: OUTBOX_JOB_BACKOFF_DELAY_MS },
      removeOnComplete: OUTBOX_COMPLETED_JOBS_KEPT,
      removeOnFail: false,
    },
  });
  openQueues.set(queueName, queue);
  return queue;
};

export const listOutboxQueues = (): Queue<OutboxJobData>[] =>
  Object.values(OUTBOX_QUEUE_NAME).map(getOutboxQueue);

export const addOutboxJob = async (
  topic: OutboxTopic,
  outboxEventId: string,
  jobData: OutboxJobData,
): Promise<void> => {
  await getOutboxQueue(queueNameForOutboxTopic(topic)).add(topic, jobData, {
    jobId: outboxEventId,
  });
};

export const closeOutboxQueues = async (): Promise<void> => {
  const queues = [...openQueues.values()];
  openQueues.clear();
  await Promise.all(queues.map((queue) => queue.close()));
};
