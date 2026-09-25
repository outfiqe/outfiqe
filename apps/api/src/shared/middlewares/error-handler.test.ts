import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { Prisma } from "#generated/prisma/client.js";
import { HandleCollisionError } from "#lib/handle.utils.js";

import { AppError, errorHandler } from "./error-handler.js";

const buildPrismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("Simulated Prisma error", {
    code,
    clientVersion: "test",
  });

const respondTo = (thrownError: Error) => {
  const app = express();
  app.get("/", () => {
    throw thrownError;
  });
  app.use(errorHandler);
  return request(app).get("/");
};

describe("errorHandler", () => {
  it("returns an AppError's own status, code and message", async () => {
    const { status, body } = await respondTo(new AppError("INVITE_USED", "Already used.", 400));

    expect(status).toBe(400);
    expect(body).toMatchObject({ code: "INVITE_USED", message: "Already used." });
  });

  it("maps an uncaught unique-constraint error to a 409 without leaking database details", async () => {
    const { status, body } = await respondTo(buildPrismaError("P2002"));

    expect(status).toBe(409);
    expect(body).toEqual({
      success: false,
      code: "ALREADY_EXISTS",
      message: "A record with these details already exists.",
    });
  });

  it("maps an uncaught missing-record error to a 404", async () => {
    const { status, body } = await respondTo(buildPrismaError("P2025"));

    expect(status).toBe(404);
    expect(body.code).toBe("NOT_FOUND");
  });

  it("maps an uncaught foreign-key error to a 409", async () => {
    const { status, body } = await respondTo(buildPrismaError("P2003"));

    expect(status).toBe(409);
    expect(body.code).toBe("REFERENCE_CONFLICT");
  });

  it("maps an exhausted handle search to a retryable 409", async () => {
    const { status, body } = await respondTo(new HandleCollisionError());

    expect(status).toBe(409);
    expect(body.code).toBe("HANDLE_UNAVAILABLE");
  });

  it("keeps an unrecognised Prisma error as a generic 500", async () => {
    const { status, body } = await respondTo(buildPrismaError("P2010"));

    expect(status).toBe(500);
    expect(body).toEqual({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    });
  });

  it("returns a generic 500 for a plain unexpected error", async () => {
    const { status, body } = await respondTo(new Error("boom"));

    expect(status).toBe(500);
    expect(body.code).toBe("INTERNAL_ERROR");
  });
});
