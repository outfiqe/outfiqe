import { createServer } from "node:http";

import logger from "#lib/winston.utils.js";
import { disconnectRedis } from "#redis/redis.client.js";
import { closeSocket, initSocket } from "#socket/socket.server.js";

import { createApp } from "./app.js";
import { env } from "./config/env.config.js";
import { bootstrapAdminIfNeeded } from "./shared/bootstrap/bootstrap-admin.js";
import { disconnectDb } from "./shared/db/prisma.js";

await bootstrapAdminIfNeeded();

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);

const server = httpServer.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await closeSocket();
      await disconnectDb();
      await disconnectRedis();
      process.exit(0);
    });
  });
}
