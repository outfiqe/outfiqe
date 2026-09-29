import { createServer } from "node:http";

import { stopDomainEventConsumers } from "#events/event-bus.consumer.js";
import logger from "#lib/winston.utils.js";
import { REALTIME_OUTBOX_QUEUE_NAMES } from "#outbox/outbox.constants.js";
import { closeOutboxQueues } from "#outbox/outbox.queues.js";
import { startOutboxWorkers, stopOutboxWorkers } from "#outbox/outbox.workers.js";
import { disconnectRedis } from "#redis/redis.client.js";
import { closeSocket, initSocket } from "#socket/socket.server.js";

import { createApp } from "../app.js";
import { env } from "../config/env.config.js";
import { bootstrapAdminIfNeeded } from "../shared/bootstrap/bootstrap-admin.js";
import { disconnectDb } from "../shared/db/prisma.js";
import { registerRealtimeConsumers } from "./consumers.js";
import { registerGracefulShutdown } from "./shutdown.js";

export const startApiProcess = async (): Promise<void> => {
  await bootstrapAdminIfNeeded();

  const app = createApp();
  const httpServer = createServer(app);
  initSocket(httpServer);
  registerRealtimeConsumers();
  startOutboxWorkers(REALTIME_OUTBOX_QUEUE_NAMES);

  const server = httpServer.listen(env.PORT, () => {
    logger.info(`API (role=api) listening on http://localhost:${env.PORT}`);
  });

  registerGracefulShutdown([
    {
      name: "http-server",
      run: () => new Promise<void>((resolve) => server.close(() => resolve())),
    },
    { name: "socket", run: closeSocket },
    { name: "domain-event-consumers", run: stopDomainEventConsumers },
    { name: "outbox-workers", run: stopOutboxWorkers },
    { name: "outbox-queues", run: closeOutboxQueues },
    { name: "db", run: disconnectDb },
    { name: "redis", run: disconnectRedis },
  ]);
};
