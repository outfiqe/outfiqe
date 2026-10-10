import os from "node:os";

const MAX_INTEGRATION_WORKERS = 8;
const REDIS_LOGICAL_DATABASE_LIMIT = 16;
const RESERVED_REDIS_LOGICAL_DATABASE = 0;
const FIRST_POOL_ID = 1;
const SAFE_DATABASE_NAME = /^[a-z0-9_]+$/i;

const LOGICAL_CPUS_PER_APP_INSTANCE = 3;

const parsePositiveInteger = (raw: string | undefined): number | undefined => {
  if (raw === undefined) return undefined;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const detectAvailableParallelism = (): number =>
  typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length;

const autoDetectedWorkerCount = (): number =>
  Math.max(FIRST_POOL_ID, Math.floor(detectAvailableParallelism() / LOGICAL_CPUS_PER_APP_INSTANCE));

const HIGHEST_USABLE_REDIS_LOGICAL_DATABASE =
  REDIS_LOGICAL_DATABASE_LIMIT - 1 - RESERVED_REDIS_LOGICAL_DATABASE;

export const INTEGRATION_WORKER_COUNT = Math.max(
  FIRST_POOL_ID,
  Math.min(
    parsePositiveInteger(process.env.INTEGRATION_WORKERS) ?? autoDetectedWorkerCount(),
    MAX_INTEGRATION_WORKERS,
    HIGHEST_USABLE_REDIS_LOGICAL_DATABASE,
  ),
);

export const resolvePoolId = (): number =>
  parsePositiveInteger(process.env.VITEST_POOL_ID) ?? FIRST_POOL_ID;

export const allWorkerPoolIds = (): number[] =>
  Array.from({ length: INTEGRATION_WORKER_COUNT }, (_, index) => index + FIRST_POOL_ID);

const assertSafeDatabaseName = (name: string): string => {
  if (!SAFE_DATABASE_NAME.test(name)) {
    throw new Error(`Refusing to use an unsafe database name derived from a URL: "${name}"`);
  }
  return name;
};

export const baseDatabaseName = (databaseUrl: string): string =>
  assertSafeDatabaseName(new URL(databaseUrl).pathname.replace(/^\//, ""));

export const templateDatabaseName = (databaseUrl: string): string =>
  `${baseDatabaseName(databaseUrl)}_template`;

export const workerDatabaseName = (databaseUrl: string, poolId: number): string =>
  `${baseDatabaseName(databaseUrl)}_w${poolId}`;

export const withDatabaseName = (databaseUrl: string, databaseName: string): string => {
  const url = new URL(databaseUrl);
  url.pathname = `/${assertSafeDatabaseName(databaseName)}`;
  return url.toString();
};

export const maintenanceDatabaseUrl = (databaseUrl: string): string =>
  withDatabaseName(databaseUrl, "postgres");

export const templateDatabaseUrl = (databaseUrl: string): string =>
  withDatabaseName(databaseUrl, templateDatabaseName(databaseUrl));

export const workerDatabaseUrl = (databaseUrl: string, poolId: number): string =>
  withDatabaseName(databaseUrl, workerDatabaseName(databaseUrl, poolId));

export const workerRedisUrl = (redisUrl: string, poolId: number): string => {
  const url = new URL(redisUrl);
  url.pathname = `/${poolId}`;
  return url.toString();
};

export const workerRedisLogicalDatabases = (): number[] => allWorkerPoolIds();
