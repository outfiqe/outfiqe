import { createServer } from "node:http";

import * as Sentry from "@sentry/node";

import { stopDomainEventConsumers } from "#events/event-bus.consumer.js";
import logger from "#lib/winston.utils.js";
import { COMMISSION_SWEEP_INTERVAL_MS } from "#modules/commissions/commission.constants.js";
import { runCommissionLifecycleSweep } from "#modules/commissions/commission.lifecycle.js";
import {
  TAG_TREND_AGGREGATION_INTERVAL_MS,
  TAG_TREND_SCORING_INTERVAL_MS,
  TRENDING_AGGREGATION_INTERVAL_MS,
  TRENDING_SCORING_INTERVAL_MS,
} from "#modules/creator-looks/creatorLook.constants.js";
import { creatorLookService } from "#modules/creator-looks/creatorLook.service.js";
import { registerCreatorLookSocketHandlers } from "#modules/creator-looks/creatorLook.socket.js";
import {
  FASTEST_GROWING_RECOMPUTE_INTERVAL_MS,
  MOST_PURCHASED_RECOMPUTE_INTERVAL_MS,
  TRENDING_RECOMPUTE_INTERVAL_MS,
} from "#modules/leaderboard/leaderboard.constants.js";
import { leaderboardService } from "#modules/leaderboard/leaderboard.service.js";
import {
  registerLeaderboardEventConsumer,
  registerLeaderboardSocketHandlers,
} from "#modules/leaderboard/leaderboard.socket.js";
import { nextIsoWeekStart } from "#modules/leaderboard/leaderboard.utils.js";
import { RECONCILE_CHECK_INTERVAL_MS } from "#modules/payments/payment.constants.js";
import { runPaymentReconciliationSweep } from "#modules/payments/payment.reconciliation.js";
import {
  AGGREGATION_INTERVAL_MS,
  SCORING_INTERVAL_MS,
} from "#modules/trending/trending.constants.js";
import { trendingService } from "#modules/trending/trending.service.js";
import { disconnectRedis } from "#redis/redis.client.js";
import { startBoundaryScheduler, startIntervalScheduler } from "#scheduling/interval.scheduler.js";
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
registerLeaderboardSocketHandlers();
registerLeaderboardEventConsumer();

startIntervalScheduler([
  {
    name: "payment-reconciliation",
    run: runPaymentReconciliationSweep,
    intervalMs: RECONCILE_CHECK_INTERVAL_MS,
  },
  {
    name: "commission-lifecycle",
    run: runCommissionLifecycleSweep,
    intervalMs: COMMISSION_SWEEP_INTERVAL_MS,
  },
  {
    name: "trending-aggregation",
    run: trendingService.runAggregation,
    intervalMs: AGGREGATION_INTERVAL_MS,
  },
  {
    name: "trending-scoring",
    run: trendingService.runScoring,
    intervalMs: SCORING_INTERVAL_MS,
  },
  {
    name: "explore-trending-aggregation",
    run: creatorLookService.runTrendingAggregation,
    intervalMs: TRENDING_AGGREGATION_INTERVAL_MS,
  },
  {
    name: "explore-trending-scoring",
    run: creatorLookService.runTrendingScoring,
    intervalMs: TRENDING_SCORING_INTERVAL_MS,
  },
  {
    name: "explore-tag-trending-aggregation",
    run: creatorLookService.runTagTrendingAggregation,
    intervalMs: TAG_TREND_AGGREGATION_INTERVAL_MS,
  },
  {
    name: "explore-tag-trending-scoring",
    run: creatorLookService.runTagTrendingScoring,
    intervalMs: TAG_TREND_SCORING_INTERVAL_MS,
  },
  {
    name: "leaderboard-most-purchased",
    run: leaderboardService.runMostPurchasedRecompute,
    intervalMs: MOST_PURCHASED_RECOMPUTE_INTERVAL_MS,
  },
  {
    name: "leaderboard-trending",
    run: leaderboardService.runTrendingRecompute,
    intervalMs: TRENDING_RECOMPUTE_INTERVAL_MS,
  },
  {
    name: "leaderboard-fastest-growing",
    run: leaderboardService.runFastestGrowingRecompute,
    intervalMs: FASTEST_GROWING_RECOMPUTE_INTERVAL_MS,
  },
]);

startBoundaryScheduler([
  {
    name: "leaderboard-boundary-most-purchased",
    run: leaderboardService.runMostPurchasedRecompute,
    nextRunAt: nextIsoWeekStart,
  },
  {
    name: "leaderboard-boundary-trending",
    run: leaderboardService.runTrendingRecompute,
    nextRunAt: nextIsoWeekStart,
  },
  {
    name: "leaderboard-boundary-fastest-growing",
    run: leaderboardService.runFastestGrowingRecompute,
    nextRunAt: nextIsoWeekStart,
  },
]);

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
