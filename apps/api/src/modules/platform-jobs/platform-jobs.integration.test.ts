import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  OUTBOX_MAX_PUBLISH_ATTEMPTS,
  OUTBOX_QUEUE_NAME,
  OUTBOX_TOPIC,
} from "#outbox/outbox.constants.js";
import { redis } from "#redis/redis.client.js";
import {
  createAdminSessionWithPlatformPermissions,
  createRoleLimitedStaffSession,
} from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";

const OK_STATUS = 200;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;

beforeEach(async () => {
  await redis.flushdb();
});

const createOutboxEvent = (overrides: Partial<{ attempts: number; publishedAt: Date }> = {}) =>
  prisma.outboxEvent.create({
    data: {
      topic: OUTBOX_TOPIC.OUTFIT_CHANGED,
      aggregateId: randomUUID(),
      payload: {},
      lastError: "Redis connection refused",
      ...overrides,
    },
  });

const asStaff = (authHeader: string) => ({
  get: (path: string) =>
    request(testApp).get(`/api/platform${path}`).set("Authorization", authHeader),
  post: (path: string) =>
    request(testApp).post(`/api/platform${path}`).set("Authorization", authHeader),
});

describe("jobs and health", () => {
  it("shows how far behind the outbox is, the stuck events and every queue", async () => {
    const stuck = await createOutboxEvent({ attempts: OUTBOX_MAX_PUBLISH_ATTEMPTS });
    await createOutboxEvent();
    await createOutboxEvent({ publishedAt: new Date() });
    const { authHeader } = await createAdminSessionWithPlatformPermissions("platform:jobs:manage");

    const health = await asStaff(authHeader).get("/jobs");

    expect(health.status).toBe(OK_STATUS);
    expect(health.body.data.outbox).toMatchObject({ unpublishedCount: 2, stuckCount: 1 });
    expect(health.body.data.outbox.oldestUnpublishedAt).not.toBeNull();
    expect(health.body.data.stuckEvents).toEqual([
      expect.objectContaining({ id: stuck.id, lastError: "Redis connection refused" }),
    ]);
    expect(health.body.data.queues.map(({ name }: { name: string }) => name).sort()).toEqual(
      Object.values(OUTBOX_QUEUE_NAME).sort(),
    );
    expect(health.body.data.queueDashboardPath).toBe("/internal/queues");
  });

  it("sends a stuck event again by clearing its tries, and audits it", async () => {
    const stuck = await createOutboxEvent({ attempts: OUTBOX_MAX_PUBLISH_ATTEMPTS });
    const { authHeader, userId } =
      await createAdminSessionWithPlatformPermissions("platform:jobs:manage");

    const retried = await asStaff(authHeader).post(`/jobs/outbox/${stuck.id}/retry`);

    expect(retried.status).toBe(OK_STATUS);
    const event = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: stuck.id } });
    expect(event).toMatchObject({ attempts: 0, lastError: null });
    const audit = await prisma.platformAuditLog.findFirstOrThrow({
      where: { targetId: stuck.id, action: "outbox-event.retried" },
    });
    expect(audit.actorUserId).toBe(userId);
  });

  it("refuses to resend an event that was already sent", async () => {
    const sent = await createOutboxEvent({ publishedAt: new Date() });
    const { authHeader } = await createAdminSessionWithPlatformPermissions("platform:jobs:manage");

    const retried = await asStaff(authHeader).post(`/jobs/outbox/${sent.id}/retry`);

    expect(retried.status).toBe(NOT_FOUND_STATUS);
  });

  it("retries failed jobs only on a known queue", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions("platform:jobs:manage");
    const staff = asStaff(authHeader);

    const known = await staff.post(`/jobs/queues/${OUTBOX_QUEUE_NAME.NOTIFY}/retry-failed`);
    expect(known.status).toBe(OK_STATUS);
    expect(known.body.data).toEqual({ retriedCount: 0 });

    const unknown = await staff.post("/jobs/queues/not-a-queue/retry-failed");
    expect(unknown.status).toBe(UNPROCESSABLE_STATUS);
  });

  it("keeps every job route from staff without the jobs permission", async () => {
    const stuck = await createOutboxEvent({ attempts: OUTBOX_MAX_PUBLISH_ATTEMPTS });
    const { authHeader } = await createRoleLimitedStaffSession("platform:builds:manage");
    const staff = asStaff(authHeader);

    expect((await staff.get("/jobs")).status).toBe(FORBIDDEN_STATUS);
    expect((await staff.post(`/jobs/outbox/${stuck.id}/retry`)).status).toBe(FORBIDDEN_STATUS);
    expect((await staff.post(`/jobs/queues/${OUTBOX_QUEUE_NAME.NOTIFY}/retry-failed`)).status).toBe(
      FORBIDDEN_STATUS,
    );
  });
});
