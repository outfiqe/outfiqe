import { createServer } from "node:http";

import { stopDomainEventConsumers } from "#events/event-bus.consumer.js";
import logger from "#lib/winston.utils.js";
import { registerCreatorLookSocketHandlers } from "#modules/creator-looks/creatorLook.socket.js";
import { disconnectRedis } from "#redis/redis.client.js";
import { registerSocketListeners } from "#socket/socket.listeners.js";
import { closeSocket, initSocket } from "#socket/socket.server.js";

import { createApp } from "./app.js";
import { env } from "./config/env.config.js";
import { bootstrapAdminIfNeeded } from "./shared/bootstrap/bootstrap-admin.js";
import { disconnectDb } from "./shared/db/prisma.js";

await bootstrapAdminIfNeeded();

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);
registerSocketListeners();
registerCreatorLookSocketHandlers();

const server = httpServer.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await closeSocket();
      await stopDomainEventConsumers();
      await disconnectDb();
      await disconnectRedis();
      process.exit(0);
    });
  });
}
