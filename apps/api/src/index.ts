import { createServer } from "node:http";

import { stopDomainEventConsumers } from "#events/event-bus.consumer.js";
import logger from "#lib/winston.utils.js";
import { COMMISSION_SWEEP_INTERVAL_MS } from "#modules/commissions/commission.constants.js";
import { runCommissionLifecycleSweep } from "#modules/commissions/commission.lifecycle.js";
import { registerCreatorLookSocketHandlers } from "#modules/creator-looks/creatorLook.socket.js";
import { RECONCILE_CHECK_INTERVAL_MS } from "#modules/payments/payment.constants.js";
import { runPaymentReconciliationSweep } from "#modules/payments/payment.reconciliation.js";
import {
  AGGREGATION_INTERVAL_MS,
  SCORING_INTERVAL_MS,
} from "#modules/trending/trending.constants.js";
import { trendingService } from "#modules/trending/trending.service.js";
import { disconnectRedis } from "#redis/redis.client.js";
import { startIntervalScheduler } from "#scheduling/interval.scheduler.js";
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
]);

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
