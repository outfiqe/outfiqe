import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resolveClientIp } from "./client-ip.js";

const ORIGIN_SECRET = "edge-secret-used-only-by-this-test";
const VISITOR_IP = "103.129.10.20";

const mockedEnv = vi.hoisted(() => ({ ORIGIN_SECRET: undefined as string | undefined }));

vi.mock("#config/env.config.js", () => ({ env: mockedEnv }));

const readResolvedIp = (headers: Record<string, string>) => {
  const app = express();
  app.use(resolveClientIp);
  app.get("/", (req, res) => {
    res.json({ ip: req.ip });
  });
  return request(app).get("/").set(headers);
};

describe("resolveClientIp", () => {
  beforeEach(() => {
    mockedEnv.ORIGIN_SECRET = ORIGIN_SECRET;
  });

  it("uses the visitor address when the request carries our edge secret", async () => {
    const response = await readResolvedIp({
      "x-origin-secret": ORIGIN_SECRET,
      "x-vercel-forwarded-for": VISITOR_IP,
    });

    expect(response.body.ip).toBe(VISITOR_IP);
  });

  it("takes the first address when several are listed", async () => {
    const response = await readResolvedIp({
      "x-origin-secret": ORIGIN_SECRET,
      "x-vercel-forwarded-for": `${VISITOR_IP}, 76.76.21.21`,
    });

    expect(response.body.ip).toBe(VISITOR_IP);
  });

  it("ignores a visitor address sent with the wrong secret", async () => {
    const response = await readResolvedIp({
      "x-origin-secret": "guessed-secret",
      "x-vercel-forwarded-for": VISITOR_IP,
    });

    expect(response.body.ip).not.toBe(VISITOR_IP);
  });

  it("ignores a visitor address sent with no secret", async () => {
    const response = await readResolvedIp({ "x-vercel-forwarded-for": VISITOR_IP });

    expect(response.body.ip).not.toBe(VISITOR_IP);
  });

  it("ignores the headers until a secret is configured", async () => {
    mockedEnv.ORIGIN_SECRET = undefined;

    const response = await readResolvedIp({
      "x-origin-secret": ORIGIN_SECRET,
      "x-vercel-forwarded-for": VISITOR_IP,
    });

    expect(response.body.ip).not.toBe(VISITOR_IP);
  });

  it("ignores a value that is not an ip address", async () => {
    const response = await readResolvedIp({
      "x-origin-secret": ORIGIN_SECRET,
      "x-vercel-forwarded-for": "not-an-address",
    });

    expect(response.body.ip).not.toBe("not-an-address");
  });
});
