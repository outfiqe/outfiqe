import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { PushPlatform } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import {
  MAX_PUSH_SUBSCRIPTIONS_PER_USER,
  PUSH_WRITE_RATE_LIMIT_MAX_REQUESTS,
} from "./push.constants.js";

beforeEach(async () => {
  await redis.flushdb();
});

const createUser = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Push Tester",
      handle: `push-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
    },
  });

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: "CUSTOMER" });
  return `Bearer ${accessToken}`;
};

const aSubscription = (overrides: Record<string, unknown> = {}) => ({
  endpoint: `https://push.example.com/${randomUUID()}`,
  keys: { p256dh: `p256dh-${randomUUID()}`, auth: `auth-${randomUUID()}` },
  platform: PushPlatform.ANDROID,
  userAgent: "Mozilla/5.0 (Linux; Android 14)",
  ...overrides,
});

describe("POST /api/push/subscriptions", () => {
  it("rejects an anonymous request", async () => {
    const response = await request(testApp).post("/api/push/subscriptions").send(aSubscription());

    expect(response.status).toBe(401);
  });

  it("rejects a body that is missing the encryption keys", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .post("/api/push/subscriptions")
      .set("Authorization", authHeaderFor(user.id))
      .send({ endpoint: "https://push.example.com/abc" });

    expect(response.status).toBe(422);
  });

  it("stores a new subscription against the signed-in user", async () => {
    const user = await createUser();
    const body = aSubscription();

    const response = await request(testApp)
      .post("/api/push/subscriptions")
      .set("Authorization", authHeaderFor(user.id))
      .send(body);

    expect(response.status).toBe(200);

    const stored = await prisma.pushSubscription.findUnique({ where: { endpoint: body.endpoint } });
    expect(stored).toMatchObject({
      userId: user.id,
      p256dhKey: body.keys.p256dh,
      authKey: body.keys.auth,
      platform: PushPlatform.ANDROID,
      failureCount: 0,
      disabledAt: null,
    });
  });

  it("updates the existing row when the same endpoint is sent again, rather than duplicating it", async () => {
    const user = await createUser();
    const endpoint = `https://push.example.com/${randomUUID()}`;

    await request(testApp)
      .post("/api/push/subscriptions")
      .set("Authorization", authHeaderFor(user.id))
      .send(aSubscription({ endpoint, platform: PushPlatform.ANDROID }));

    await request(testApp)
      .post("/api/push/subscriptions")
      .set("Authorization", authHeaderFor(user.id))
      .send(aSubscription({ endpoint, platform: PushPlatform.DESKTOP }));

    const rows = await prisma.pushSubscription.findMany({ where: { endpoint } });
    expect(rows).toHaveLength(1);
    expect(rows.at(0)?.platform).toBe(PushPlatform.DESKTOP);
  });

  it("reassigns an endpoint to whoever most recently signed in on that device", async () => {
    const firstUser = await createUser();
    const secondUser = await createUser();
    const endpoint = `https://push.example.com/${randomUUID()}`;

    await request(testApp)
      .post("/api/push/subscriptions")
      .set("Authorization", authHeaderFor(firstUser.id))
      .send(aSubscription({ endpoint }));

    await request(testApp)
      .post("/api/push/subscriptions")
      .set("Authorization", authHeaderFor(secondUser.id))
      .send(aSubscription({ endpoint }));

    const stored = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    expect(stored?.userId).toBe(secondUser.id);
  });

  it("clears a disabled flag and failure count when a device re-subscribes", async () => {
    const user = await createUser();
    const endpoint = `https://push.example.com/${randomUUID()}`;
    await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint,
        p256dhKey: "old",
        authKey: "old",
        failureCount: 5,
        disabledAt: new Date(),
      },
    });

    await request(testApp)
      .post("/api/push/subscriptions")
      .set("Authorization", authHeaderFor(user.id))
      .send(aSubscription({ endpoint }));

    const stored = await prisma.pushSubscription.findUnique({ where: { endpoint } });
    expect(stored).toMatchObject({ failureCount: 0, disabledAt: null });
  });

  it("keeps only the most recently seen devices when a user exceeds the cap", async () => {
    const user = await createUser();

    for (let index = 0; index < MAX_PUSH_SUBSCRIPTIONS_PER_USER + 3; index += 1) {
      await request(testApp)
        .post("/api/push/subscriptions")
        .set("Authorization", authHeaderFor(user.id))
        .send(aSubscription());
    }

    const count = await prisma.pushSubscription.count({ where: { userId: user.id } });
    expect(count).toBe(MAX_PUSH_SUBSCRIPTIONS_PER_USER);
  });

  it("rate limits a client hammering the endpoint", async () => {
    const user = await createUser();
    const authHeader = authHeaderFor(user.id);

    let sawRateLimit = false;
    for (let attempt = 0; attempt < PUSH_WRITE_RATE_LIMIT_MAX_REQUESTS + 2; attempt += 1) {
      const response = await request(testApp)
        .post("/api/push/subscriptions")
        .set("Authorization", authHeader)
        .send(aSubscription());
      if (response.status === 429) {
        sawRateLimit = true;
        break;
      }
    }

    expect(sawRateLimit).toBe(true);
  });
});

describe("DELETE /api/push/subscriptions", () => {
  it("removes only the caller's own subscription for that endpoint", async () => {
    const owner = await createUser();
    const someoneElse = await createUser();
    const ownEndpoint = `https://push.example.com/${randomUUID()}`;
    const otherEndpoint = `https://push.example.com/${randomUUID()}`;

    await prisma.pushSubscription.createMany({
      data: [
        { userId: owner.id, endpoint: ownEndpoint, p256dhKey: "a", authKey: "b" },
        { userId: someoneElse.id, endpoint: otherEndpoint, p256dhKey: "a", authKey: "b" },
      ],
    });

    const response = await request(testApp)
      .delete("/api/push/subscriptions")
      .set("Authorization", authHeaderFor(owner.id))
      .send({ endpoint: ownEndpoint });

    expect(response.status).toBe(204);
    expect(
      await prisma.pushSubscription.findUnique({ where: { endpoint: ownEndpoint } }),
    ).toBeNull();
    expect(
      await prisma.pushSubscription.findUnique({ where: { endpoint: otherEndpoint } }),
    ).not.toBeNull();
  });

  it("does not let one user delete another user's subscription by knowing its endpoint", async () => {
    const attacker = await createUser();
    const victim = await createUser();
    const victimEndpoint = `https://push.example.com/${randomUUID()}`;
    await prisma.pushSubscription.create({
      data: { userId: victim.id, endpoint: victimEndpoint, p256dhKey: "a", authKey: "b" },
    });

    const response = await request(testApp)
      .delete("/api/push/subscriptions")
      .set("Authorization", authHeaderFor(attacker.id))
      .send({ endpoint: victimEndpoint });

    expect(response.status).toBe(204);
    expect(
      await prisma.pushSubscription.findUnique({ where: { endpoint: victimEndpoint } }),
    ).not.toBeNull();
  });
});

describe("GET /api/push/public-key", () => {
  it("returns the configured key, or null when push is not set up", async () => {
    const response = await request(testApp).get("/api/push/public-key");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("publicKey");
  });
});
