import logger from "#lib/winston.utils.js";

import { env } from "./config/env.config.js";

const starters = {
  all: () => import("./processes/combined.process.js").then((m) => m.startCombinedProcess()),
  api: () => import("./processes/api.process.js").then((m) => m.startApiProcess()),
  worker: () => import("./processes/worker.process.js").then((m) => m.startWorkerProcess()),
  scheduler: () =>
    import("./processes/scheduler.process.js").then((m) => m.startSchedulerProcess()),
} as const;

logger.info(`Starting process with PROCESS_ROLE=${env.PROCESS_ROLE}`);
await starters[env.PROCESS_ROLE]();
