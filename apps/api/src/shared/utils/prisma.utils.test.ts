import { describe, expect, it } from "vitest";

import { Prisma } from "#generated/prisma/client.js";

import {
  isForeignKeyConstraintError,
  isTransactionConflictError,
  isUniqueConstraintError,
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
