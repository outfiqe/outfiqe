import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { NotificationType, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { testApp } from "#test/integration/testApp.js";

const createUserSession = async (): Promise<{ userId: string; authHeader: string }> => {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      email: `notif-rest-${suffix}@outfiqe.test`,
      name: `Notif Rest ${suffix}`,
      handle: `notif-rest-${suffix}`,
      phone: `95${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
  const { accessToken } = generateTokenpair({ sub: user.id, role: UserRole.CUSTOMER });
  return { userId: user.id, authHeader: `Bearer ${accessToken}` };
};

const createNotification = (recipientId: string, overrides: Partial<{ isRead: boolean }> = {}) =>
  prisma.notification.create({
    data: {
      recipientId,
      type: NotificationType.LEVEL_UP,
      metadata: { levelName: "Rising Star" },
      isRead: overrides.isRead ?? false,
    },
  });

describe("GET /api/notifications", () => {
  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/notifications");
    expect(response.status).toBe(401);
  });

  it("returns only the caller's notifications, paginated", async () => {
    const { userId, authHeader } = await createUserSession();
    const other = await createUserSession();

    for (let i = 0; i < 3; i += 1) await createNotification(userId);
    await createNotification(other.userId);

    const firstPage = await request(testApp)
      .get("/api/notifications")
      .query({ limit: 2 })
      .set("Authorization", authHeader);

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.notifications).toHaveLength(2);
    expect(firstPage.body.data.nextCursor).not.toBeNull();

    const secondPage = await request(testApp)
      .get("/api/notifications")
      .query({ limit: 2, cursor: firstPage.body.data.nextCursor })
      .set("Authorization", authHeader);

    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.notifications).toHaveLength(1);
    expect(secondPage.body.data.nextCursor).toBeNull();
  });
});

describe("GET /api/notifications/unread-count", () => {
  it("counts only unread notifications for the caller", async () => {
    const { userId, authHeader } = await createUserSession();
    await createNotification(userId, { isRead: false });
    await createNotification(userId, { isRead: false });
    await createNotification(userId, { isRead: true });

    const response = await request(testApp)
      .get("/api/notifications/unread-count")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.count).toBe(2);
  });
});

describe("PATCH /api/notifications/:id/read", () => {
  it("marks the caller's own notification as read", async () => {
    const { userId, authHeader } = await createUserSession();
    const notification = await createNotification(userId);

    const response = await request(testApp)
      .patch(`/api/notifications/${notification.id}/read`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);

    const updated = await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } });
    expect(updated.isRead).toBe(true);
    expect(updated.readAt).not.toBeNull();
  });

  it("returns 404 for someone else's notification, never leaking existence", async () => {
    const owner = await createUserSession();
    const other = await createUserSession();
    const notification = await createNotification(owner.userId);

    const response = await request(testApp)
      .patch(`/api/notifications/${notification.id}/read`)
      .set("Authorization", other.authHeader);

    expect(response.status).toBe(404);
  });

  it("returns 404 for an unknown notification id", async () => {
    const { authHeader } = await createUserSession();

    const response = await request(testApp)
      .patch(`/api/notifications/${randomUUID()}/read`)
      .set("Authorization", authHeader);

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/notifications/read-all", () => {
  it("marks every unread notification as read and is idempotent", async () => {
    const { userId, authHeader } = await createUserSession();
    await createNotification(userId);
    await createNotification(userId);

    const first = await request(testApp)
      .patch("/api/notifications/read-all")
      .set("Authorization", authHeader);
    expect(first.status).toBe(200);

    const unreadAfterFirst = await prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
    expect(unreadAfterFirst).toBe(0);

    const second = await request(testApp)
      .patch("/api/notifications/read-all")
      .set("Authorization", authHeader);
    expect(second.status).toBe(200);
  });
});

describe("notification preferences", () => {
  it("defaults every type to enabled", async () => {
    const { authHeader } = await createUserSession();

    const response = await request(testApp)
      .get("/api/notifications/preferences")
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    const { preferences } = response.body.data;
    expect(preferences).toHaveLength(Object.keys(NotificationType).length);
    expect(preferences.every((preference: { enabled: boolean }) => preference.enabled)).toBe(true);
  });

  it("mutes and unmutes a single type", async () => {
    const { userId, authHeader } = await createUserSession();

    const mute = await request(testApp)
      .patch(`/api/notifications/preferences/${NotificationType.LOOK_LIKED}`)
      .set("Authorization", authHeader)
      .send({ enabled: false });
    expect(mute.status).toBe(200);

    const stored = await prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type: NotificationType.LOOK_LIKED } },
    });
    expect(stored?.enabled).toBe(false);

    const unmute = await request(testApp)
      .patch(`/api/notifications/preferences/${NotificationType.LOOK_LIKED}`)
      .set("Authorization", authHeader)
      .send({ enabled: true });
    expect(unmute.status).toBe(200);

    const restored = await prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type: NotificationType.LOOK_LIKED } },
    });
    expect(restored?.enabled).toBe(true);
  });
});
