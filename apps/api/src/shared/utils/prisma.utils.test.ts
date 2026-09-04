import { describe, expect, it, vi } from "vitest";

import { Prisma } from "#generated/prisma/client.js";

import {
  isDeadlockError,
  isForeignKeyConstraintError,
  isTransactionConflictError,
  isUniqueConstraintError,
  runWithDeadlockRetry,
  uniqueConstraintTargetIncludes,
} from "./prisma.utils.js";

const buildPrismaError = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError("Simulated Prisma error", {
    code,
    clientVersion: "test",
    meta,
  });

const buildDriverAdapterUniqueError = (fields: string[], originalMessage: string) =>
  buildPrismaError("P2002", {
    modelName: "Organization",
    driverAdapterError: {
      name: "DriverAdapterError",
      cause: {
        kind: "UniqueConstraintViolation",
        originalMessage,
        constraint: { fields },
      },
    },
  });

const buildDriverAdapterDeadlockError = () =>
  buildPrismaError("P2039", {
    driverAdapterError: {
      name: "DriverAdapterError",
      cause: {
        kind: "postgres",
        originalCode: "40P01",
        originalMessage: "deadlock detected",
      },
    },
  });

describe("isUniqueConstraintError", () => {
  it("is true for a P2002 error", () => {
    expect(isUniqueConstraintError(buildPrismaError("P2002"))).toBe(true);
  });

  it("is false for a different Prisma error code and for non-Prisma errors", () => {
    expect(isUniqueConstraintError(buildPrismaError("P2003"))).toBe(false);
    expect(isUniqueConstraintError(new Error("boom"))).toBe(false);
  });
});

describe("isForeignKeyConstraintError", () => {
  it("is true for a P2003 error", () => {
    expect(isForeignKeyConstraintError(buildPrismaError("P2003"))).toBe(true);
  });

  it("is false for a different Prisma error code and for non-Prisma errors", () => {
    expect(isForeignKeyConstraintError(buildPrismaError("P2002"))).toBe(false);
    expect(isForeignKeyConstraintError(new Error("boom"))).toBe(false);
  });
});

describe("isTransactionConflictError", () => {
  it("is true for a P2034 error", () => {
    expect(isTransactionConflictError(buildPrismaError("P2034"))).toBe(true);
  });

  it("is false for a different Prisma error code and for non-Prisma errors", () => {
    expect(isTransactionConflictError(buildPrismaError("P2002"))).toBe(false);
    expect(isTransactionConflictError(new Error("boom"))).toBe(false);
  });
});

describe("isDeadlockError", () => {
  it("is true for a raw Postgres deadlock wrapped as P2039", () => {
    expect(isDeadlockError(buildDriverAdapterDeadlockError())).toBe(true);
  });

  it("is true for a P2034 write-conflict error", () => {
    expect(isDeadlockError(buildPrismaError("P2034"))).toBe(true);
  });

  it("is false for a P2039 error from a different underlying cause", () => {
    expect(
      isDeadlockError(
        buildPrismaError("P2039", {
          driverAdapterError: { cause: { originalCode: "57014", originalMessage: "timeout" } },
        }),
      ),
    ).toBe(false);
  });

  it("is false for a different Prisma error code and for non-Prisma errors", () => {
    expect(isDeadlockError(buildPrismaError("P2002"))).toBe(false);
    expect(isDeadlockError(new Error("boom"))).toBe(false);
  });
});

describe("runWithDeadlockRetry", () => {
  it("returns the result on the first success without retrying", async () => {
    const operation = vi.fn().mockResolvedValue("ok");

    await expect(runWithDeadlockRetry(operation)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("retries after a deadlock and returns the eventual success", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(buildDriverAdapterDeadlockError())
      .mockResolvedValueOnce("ok");

    await expect(runWithDeadlockRetry(operation)).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("gives up and rethrows after exhausting retries on repeated deadlocks", async () => {
    const operation = vi.fn().mockRejectedValue(buildDriverAdapterDeadlockError());

    await expect(runWithDeadlockRetry(operation)).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("rethrows immediately for a non-deadlock error without retrying", async () => {
    const operation = vi.fn().mockRejectedValue(buildPrismaError("P2002"));

    await expect(runWithDeadlockRetry(operation)).rejects.toThrow();
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe("uniqueConstraintTargetIncludes", () => {
  it("matches the offending column from a Prisma 7 driver-adapter error", () => {
    const error = buildDriverAdapterUniqueError(
      ["linked_brand_id"],
      'duplicate key value violates unique constraint "organizations_linked_brand_id_key"',
    );

    expect(uniqueConstraintTargetIncludes(error, "linked_brand_id")).toBe(true);
    expect(uniqueConstraintTargetIncludes(error, "subdomain")).toBe(false);
  });

  it("matches the legacy meta.target shape as an array or a string", () => {
    expect(
      uniqueConstraintTargetIncludes(
        buildPrismaError("P2002", { target: ["subdomain"] }),
        "subdomain",
      ),
    ).toBe(true);
    expect(
      uniqueConstraintTargetIncludes(
        buildPrismaError("P2002", { target: "organizations_subdomain_key" }),
        "subdomain",
      ),
    ).toBe(true);
  });

  it("is false when the error is not a unique-constraint violation or has no usable metadata", () => {
    expect(uniqueConstraintTargetIncludes(buildPrismaError("P2003"), "linked_brand_id")).toBe(
      false,
    );
    expect(uniqueConstraintTargetIncludes(new Error("boom"), "linked_brand_id")).toBe(false);
    expect(uniqueConstraintTargetIncludes(buildPrismaError("P2002"), "linked_brand_id")).toBe(
      false,
    );
  });
});
