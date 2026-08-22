import { createServer } from "node:http";

import * as Sentry from "@sentry/node";

import { stopDomainEventConsumers } from "#events/event-bus.consumer.js";
import logger from "#lib/winston.utils.js";
import { registerAchievementEventConsumers } from "#modules/achievements/achievement.events.js";
import { registerAchievementSocketEventConsumer } from "#modules/achievements/achievement.socket.js";
import {
  registerCreatorLeaderboardEventConsumer,
  registerCreatorLeaderboardSocketHandlers,
} from "#modules/creator-leaderboard/creatorLeaderboard.socket.js";
import { registerCreatorLookSocketHandlers } from "#modules/creator-looks/creatorLook.socket.js";
import {
  registerLeaderboardEventConsumer,
  registerLeaderboardSocketHandlers,
} from "#modules/leaderboard/leaderboard.socket.js";
import { registerXpEventConsumers } from "#modules/xp/xp.events.js";
import { registerXpSocketEventConsumer } from "#modules/xp/xp.socket.js";
import { disconnectRedis } from "#redis/redis.client.js";
import { startBoundaryScheduler, startIntervalScheduler } from "#scheduling/interval.scheduler.js";
import { registerSocketListeners } from "#socket/socket.listeners.js";
import { closeSocket, initSocket } from "#socket/socket.server.js";

import { createApp } from "./app.js";
import { env } from "./config/env.config.js";
import { BOUNDARY_JOBS, INTERVAL_JOBS } from "./jobs/scheduled-jobs.js";
import { bootstrapAdminIfNeeded } from "./shared/bootstrap/bootstrap-admin.js";
import { disconnectDb } from "./shared/db/prisma.js";

await bootstrapAdminIfNeeded();

const app = createApp();
const httpServer = createServer(app);
initSocket(httpServer);
registerSocketListeners();
registerCreatorLookSocketHandlers();
registerLeaderboardSocketHandlers();
registerLeaderboardEventConsumer();
registerCreatorLeaderboardSocketHandlers();
registerCreatorLeaderboardEventConsumer();
registerXpEventConsumers();
registerAchievementEventConsumers();
registerXpSocketEventConsumer();
registerAchievementSocketEventConsumer();

startIntervalScheduler(INTERVAL_JOBS);
startBoundaryScheduler(BOUNDARY_JOBS);

const server = httpServer.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`);
});

const SENTRY_SHUTDOWN_FLUSH_TIMEOUT_MS = 2000;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    logger.info(`${signal} received, shutting down gracefully`);
    server.close(async () => {
      await closeSocket();
      await stopDomainEventConsumers();
      await disconnectDb();
      await disconnectRedis();
      await Sentry.close(SENTRY_SHUTDOWN_FLUSH_TIMEOUT_MS);
      process.exit(0);
    });
  });
}
