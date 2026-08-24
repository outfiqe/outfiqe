import { describe, expect, it } from "vitest";

import { Prisma } from "#generated/prisma/client.js";

import {
  isForeignKeyConstraintError,
  isTransactionConflictError,
  isUniqueConstraintError,
} from "./prisma.utils.js";

const buildPrismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("Simulated Prisma error", {
    code,
    clientVersion: "test",
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
