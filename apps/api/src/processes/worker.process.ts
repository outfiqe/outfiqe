import { closeImageProcessingQueues } from "@outfiqe/image-pipeline";

import { stopDomainEventConsumers } from "#events/event-bus.consumer.js";
import { BACKGROUND_OUTBOX_QUEUE_NAMES } from "#outbox/outbox.constants.js";
import { closeOutboxQueues } from "#outbox/outbox.queues.js";
import { startOutboxWorkers, stopOutboxWorkers } from "#outbox/outbox.workers.js";
import { disconnectRedis } from "#redis/redis.client.js";

import { env } from "../config/env.config.js";
import { imageProcessingQueues } from "../modules/image-processing/image-processing.queue.js";
import {
  startImageProcessingWorkers,
  stopImageProcessingWorkers,
} from "../modules/image-processing/image-processing.workers.js";
import { disconnectDb } from "../shared/db/prisma.js";
import { registerBackgroundConsumers } from "./consumers.js";
import { startHealthServer } from "./health-server.js";
import { registerGracefulShutdown } from "./shutdown.js";

export const startWorkerProcess = async (): Promise<void> => {
  registerBackgroundConsumers();
  await startImageProcessingWorkers();
  startOutboxWorkers(BACKGROUND_OUTBOX_QUEUE_NAMES);

  const health = startHealthServer(env.PORT, "worker");

  registerGracefulShutdown([
    { name: "health-server", run: health.close },
    { name: "domain-event-consumers", run: stopDomainEventConsumers },
    { name: "outbox-workers", run: stopOutboxWorkers },
    { name: "outbox-queues", run: closeOutboxQueues },
    { name: "image-workers", run: stopImageProcessingWorkers },
    { name: "image-queues", run: () => closeImageProcessingQueues(imageProcessingQueues) },
    { name: "db", run: disconnectDb },
    { name: "redis", run: disconnectRedis },
  ]);
};
