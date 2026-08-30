import { execSync } from "node:child_process";
import path from "node:path";

import { config as loadEnvFile } from "dotenv";
import { Redis } from "ioredis";
import { Client } from "pg";

import {
  allWorkerPoolIds,
  maintenanceDatabaseUrl,
  templateDatabaseName,
  templateDatabaseUrl,
  workerDatabaseName,
  workerRedisLogicalDatabases,
} from "./workerPool.js";

const MISSING_TEST_DATABASE_URL_MESSAGE =
  "TEST_DATABASE_URL is not set. Integration tests refuse to start without it, since each " +
  "worker gets its own clone of it and resetDatabase() truncates every table after each test — " +
  "copy apps/api/.env.test.example to apps/api/.env.test and set it there.";

const quoteIdentifier = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;

const databaseExists = async (maintenanceClient: Client, name: string): Promise<boolean> => {
  const { rowCount } = await maintenanceClient.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [name],
  );
  return (rowCount ?? 0) > 0;
};

const ensureDatabaseExists = async (maintenanceClient: Client, name: string): Promise<void> => {
  if (!(await databaseExists(maintenanceClient, name))) {
    await maintenanceClient.query(`CREATE DATABASE ${quoteIdentifier(name)}`);
  }
};

const dropDatabaseIfExists = async (maintenanceClient: Client, name: string): Promise<void> => {
  await maintenanceClient.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(name)} WITH (FORCE)`);
};

const recreateDatabaseFromTemplate = async (
  maintenanceClient: Client,
  name: string,
  fromTemplate: string,
): Promise<void> => {
  await dropDatabaseIfExists(maintenanceClient, name);
  await maintenanceClient.query(
    `CREATE DATABASE ${quoteIdentifier(name)} TEMPLATE ${quoteIdentifier(fromTemplate)}`,
  );
};

const migrateTemplateDatabase = (templateUrl: string, testEnv: Record<string, string>): void => {
  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, ...testEnv, DATABASE_URL: templateUrl },
  });
};

const flushWorkerRedisDatabases = async (baseRedisUrl: string): Promise<void> => {
  await Promise.all(
    workerRedisLogicalDatabases().map(async (logicalDatabase) => {
      const workerRedis = new Redis(baseRedisUrl, { db: logicalDatabase, lazyConnect: true });
      try {
        await workerRedis.connect();
        await workerRedis.flushdb();
      } finally {
        workerRedis.disconnect();
      }
    }),
  );
};

export default async function setup(): Promise<() => Promise<void>> {
  const parsedTestEnv =
    loadEnvFile({ path: path.resolve(import.meta.dirname, "../../../.env.test") }).parsed ?? {};
  const testDatabaseUrl = parsedTestEnv.TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
  const testRedisUrl = parsedTestEnv.REDIS_URL ?? process.env.REDIS_URL ?? "redis://localhost:6379";

  if (!testDatabaseUrl) {
    throw new Error(MISSING_TEST_DATABASE_URL_MESSAGE);
  }

  const templateName = templateDatabaseName(testDatabaseUrl);
  const workerPoolIds = allWorkerPoolIds();

  const maintenanceClient = new Client({
    connectionString: maintenanceDatabaseUrl(testDatabaseUrl),
  });
  await maintenanceClient.connect();
  await ensureDatabaseExists(maintenanceClient, templateName);
  await maintenanceClient.end();

  migrateTemplateDatabase(templateDatabaseUrl(testDatabaseUrl), parsedTestEnv);

  const cloningClient = new Client({
    connectionString: maintenanceDatabaseUrl(testDatabaseUrl),
  });
  await cloningClient.connect();
  try {
    for (const poolId of workerPoolIds) {
      await recreateDatabaseFromTemplate(
        cloningClient,
        workerDatabaseName(testDatabaseUrl, poolId),
        templateName,
      );
    }
  } finally {
    await cloningClient.end();
  }

  await flushWorkerRedisDatabases(testRedisUrl);

  return async () => {
    const teardownClient = new Client({
      connectionString: maintenanceDatabaseUrl(testDatabaseUrl),
    });
    await teardownClient.connect();
    try {
      for (const poolId of workerPoolIds) {
        await dropDatabaseIfExists(teardownClient, workerDatabaseName(testDatabaseUrl, poolId));
      }
    } finally {
      await teardownClient.end();
    }
  };
}
