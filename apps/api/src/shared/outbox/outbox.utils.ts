import type { RedisOptions } from "bullmq";

import {
  OUTBOX_LAST_ERROR_MAX_LENGTH,
  OUTBOX_TOPIC,
  QUEUE_NAME_BY_OUTBOX_TOPIC,
} from "./outbox.constants.js";
import type { OutboxQueueName, OutboxTopic } from "./outbox.types.js";

const OUTBOX_TOPICS: readonly string[] = Object.values(OUTBOX_TOPIC);
const TLS_REDIS_PROTOCOL = "rediss:";
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DATABASE = 0;
const DATABASE_PATH_PREFIX = "/";

export const isOutboxTopic = (topic: string): topic is OutboxTopic => OUTBOX_TOPICS.includes(topic);

export const queueNameForOutboxTopic = (topic: OutboxTopic): OutboxQueueName =>
  QUEUE_NAME_BY_OUTBOX_TOPIC[topic];

export const truncateOutboxError = (errorDescription: string): string =>
  errorDescription.slice(0, OUTBOX_LAST_ERROR_MAX_LENGTH);

const parseRedisDatabase = (pathname: string): number => {
  const databaseSegment = pathname.replace(DATABASE_PATH_PREFIX, "");
  const database = Number.parseInt(databaseSegment, 10);
  return Number.isInteger(database) ? database : DEFAULT_REDIS_DATABASE;
};

export const toQueueConnectionOptions = (
  redisUrl: string,
  retryBehaviour: Pick<RedisOptions, "maxRetriesPerRequest" | "enableOfflineQueue">,
): RedisOptions => {
  const { protocol, hostname, port, username, password, pathname } = new URL(redisUrl);
  return {
    host: hostname,
    port: port ? Number(port) : DEFAULT_REDIS_PORT,
    username: username ? decodeURIComponent(username) : undefined,
    password: password ? decodeURIComponent(password) : undefined,
    db: parseRedisDatabase(pathname),
    tls: protocol === TLS_REDIS_PROTOCOL ? {} : undefined,
    ...retryBehaviour,
  };
};
