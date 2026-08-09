import { createApp } from "./app.js";
import { env } from "./config/env.config.js";
import { disconnectDb } from "./shared/db/prisma.js";
import { bootstrapAdminIfNeeded } from "./shared/bootstrap/bootstrap-admin.js";

import logger from "#lib/winston.utils.js";

await bootstrapAdminIfNeeded();

const app = createApp();
const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  });
}
