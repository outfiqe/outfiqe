import { disconnectRedis } from "#redis/redis.client.js";
import { startBoundaryScheduler, startIntervalScheduler } from "#scheduling/interval.scheduler.js";

import { env } from "../config/env.config.js";
import { BOUNDARY_JOBS, INTERVAL_JOBS } from "../jobs/scheduled-jobs.js";
import { disconnectDb } from "../shared/db/prisma.js";
import { startHealthServer } from "./health-server.js";
import { registerGracefulShutdown } from "./shutdown.js";

export const startSchedulerProcess = (): void => {
  startIntervalScheduler(INTERVAL_JOBS);
  startBoundaryScheduler(BOUNDARY_JOBS);

  const health = startHealthServer(env.PORT, "scheduler");

  registerGracefulShutdown([
    { name: "health-server", run: health.close },
    { name: "db", run: disconnectDb },
    { name: "redis", run: disconnectRedis },
  ]);
};
