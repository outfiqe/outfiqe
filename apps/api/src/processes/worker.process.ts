import { closeImageProcessingQueues } from "@outfiqe/image-pipeline";

import { stopDomainEventConsumers } from "#events/event-bus.consumer.js";
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

  const health = startHealthServer(env.PORT, "worker");

  registerGracefulShutdown([
    { name: "health-server", run: health.close },
    { name: "domain-event-consumers", run: stopDomainEventConsumers },
    { name: "image-workers", run: stopImageProcessingWorkers },
    { name: "image-queues", run: () => closeImageProcessingQueues(imageProcessingQueues) },
    { name: "db", run: disconnectDb },
    { name: "redis", run: disconnectRedis },
  ]);
};
