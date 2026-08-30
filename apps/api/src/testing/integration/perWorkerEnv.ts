import { resolvePoolId, workerDatabaseUrl, workerRedisUrl } from "./workerPool.js";

const WORKER_ROUTING_SENTINEL = "INTEGRATION_WORKER_ROUTED";
const FALLBACK_REDIS_URL = "redis://localhost:6379";

if (process.env[WORKER_ROUTING_SENTINEL] !== "1") {
  const poolId = resolvePoolId();
  const baseDatabaseUrl = process.env.DATABASE_URL;

  if (!baseDatabaseUrl) {
    throw new Error(
      "Integration worker started without DATABASE_URL. vitest.config.ts's integration `env` " +
        "block is expected to seed it from .env.test's TEST_DATABASE_URL before setup files run.",
    );
  }

  process.env.DATABASE_URL = workerDatabaseUrl(baseDatabaseUrl, poolId);
  process.env.REDIS_URL = workerRedisUrl(process.env.REDIS_URL ?? FALLBACK_REDIS_URL, poolId);
  process.env[WORKER_ROUTING_SENTINEL] = "1";
}
