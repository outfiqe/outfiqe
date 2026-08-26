import type { RedisOptions } from "bullmq";

import { pipelineConfig } from "../config/pipeline.config.js";

export const createQueueRedisConnectionOptions = (): RedisOptions => {
  const { host, port, password, db, tls } = pipelineConfig.redis;
  return {
    host,
    port,
    password,
    db,
    tls: tls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
};
