import { afterEach, describe, expect, it } from "vitest";

import {
  allWorkerPoolIds,
  baseDatabaseName,
  maintenanceDatabaseUrl,
  resolvePoolId,
  templateDatabaseName,
  templateDatabaseUrl,
  withDatabaseName,
  workerDatabaseName,
  workerDatabaseUrl,
  workerRedisUrl,
} from "./workerPool.js";

const POSTGRES_URL = "postgresql://outfiqe:outfiqe@localhost:5432/outfiqe_test_db?schema=public";
const originalPoolId = process.env.VITEST_POOL_ID;

afterEach(() => {
  if (originalPoolId === undefined) {
    delete process.env.VITEST_POOL_ID;
  } else {
    process.env.VITEST_POOL_ID = originalPoolId;
  }
});

describe("baseDatabaseName", () => {
  it("extracts the database name from a connection URL", () => {
    expect(baseDatabaseName(POSTGRES_URL)).toBe("outfiqe_test_db");
  });

  it("rejects a database name with characters that can't be safely quoted", () => {
    expect(() => baseDatabaseName("postgresql://localhost:5432/db;drop")).toThrow(/unsafe/i);
  });
});

describe("derived database names", () => {
  it("names the template and worker databases off the base", () => {
    expect(templateDatabaseName(POSTGRES_URL)).toBe("outfiqe_test_db_template");
    expect(workerDatabaseName(POSTGRES_URL, 3)).toBe("outfiqe_test_db_w3");
  });
});

describe("URL rewriting", () => {
  it("swaps the database name while preserving credentials, host, and query", () => {
    expect(withDatabaseName(POSTGRES_URL, "outfiqe_test_db_w2")).toBe(
      "postgresql://outfiqe:outfiqe@localhost:5432/outfiqe_test_db_w2?schema=public",
    );
  });

  it("points the maintenance URL at the postgres database", () => {
    expect(maintenanceDatabaseUrl(POSTGRES_URL)).toBe(
      "postgresql://outfiqe:outfiqe@localhost:5432/postgres?schema=public",
    );
  });

  it("builds the template and per-worker database URLs", () => {
    expect(templateDatabaseUrl(POSTGRES_URL)).toBe(
      "postgresql://outfiqe:outfiqe@localhost:5432/outfiqe_test_db_template?schema=public",
    );
    expect(workerDatabaseUrl(POSTGRES_URL, 1)).toBe(
      "postgresql://outfiqe:outfiqe@localhost:5432/outfiqe_test_db_w1?schema=public",
    );
  });

  it("selects a per-worker Redis logical database", () => {
    expect(workerRedisUrl("redis://localhost:6379", 5)).toBe("redis://localhost:6379/5");
    expect(workerRedisUrl("redis://localhost:6379/0", 7)).toBe("redis://localhost:6379/7");
  });
});

describe("resolvePoolId", () => {
  it("reads the vitest pool id when it is a positive integer", () => {
    process.env.VITEST_POOL_ID = "4";
    expect(resolvePoolId()).toBe(4);
  });

  it("falls back to the first pool id for missing or non-positive values", () => {
    for (const invalid of ["0", "-2", "abc", ""]) {
      process.env.VITEST_POOL_ID = invalid;
      expect(resolvePoolId()).toBe(1);
    }
    delete process.env.VITEST_POOL_ID;
    expect(resolvePoolId()).toBe(1);
  });
});

describe("allWorkerPoolIds", () => {
  it("returns a consecutive range starting at one, capped to the worker limit", () => {
    const poolIds = allWorkerPoolIds();
    expect(poolIds[0]).toBe(1);
    expect(poolIds).toEqual([...poolIds].sort((first, second) => first - second));
    expect(poolIds.at(-1)).toBe(poolIds.length);
    expect(poolIds.length).toBeGreaterThanOrEqual(1);
    expect(poolIds.length).toBeLessThanOrEqual(8);
  });
});
