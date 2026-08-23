import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { NotificationType, UserRole } from "#generated/prisma/enums.js";

import { runNotificationRetentionSweep } from "./notification.retention.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const createRecipient = async () => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `retention-${suffix}@outfiqe.test`,
      name: `Retention Test ${suffix}`,
      handle: `retention-test-${suffix}`,
      phone: `94${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

const createNotification = async (
  recipientId: string,
  type: NotificationType,
  overrides: Partial<{ isRead: boolean; readAt: Date | null }> = {},
) =>
  prisma.notification.create({
    data: {
      recipientId,
      type,
      metadata: {},
      isRead: overrides.isRead ?? false,
      readAt: overrides.readAt ?? null,
    },
  });

const daysAgo = (days: number): Date => new Date(Date.now() - days * DAY_MS);

describe("runNotificationRetentionSweep", () => {
  it("never deletes an unread notification, regardless of age", async () => {
    const recipient = await createRecipient();
    const stale = await createNotification(recipient.id, NotificationType.LEVEL_UP, {
      isRead: false,
    });
    await prisma.notification.update({
      where: { id: stale.id },
      data: { createdAt: daysAgo(400), updatedAt: daysAgo(400) },
    });

    await runNotificationRetentionSweep();

    const survivor = await prisma.notification.findUnique({ where: { id: stale.id } });
    expect(survivor).not.toBeNull();
  });

  it("deletes a standard-type notification read more than 90 days ago", async () => {
    const recipient = await createRecipient();
    const old = await createNotification(recipient.id, NotificationType.LOOK_LIKED, {
      isRead: true,
      readAt: daysAgo(91),
    });

    await runNotificationRetentionSweep();

    const deleted = await prisma.notification.findUnique({ where: { id: old.id } });
    expect(deleted).toBeNull();
  });

  it("keeps a standard-type notification read less than 90 days ago", async () => {
    const recipient = await createRecipient();
    const recent = await createNotification(recipient.id, NotificationType.LOOK_LIKED, {
      isRead: true,
      readAt: daysAgo(30),
    });

    await runNotificationRetentionSweep();

    const survivor = await prisma.notification.findUnique({ where: { id: recent.id } });
    expect(survivor).not.toBeNull();
  });

  it("keeps a critical-type notification read 91 days ago, before its 180-day window", async () => {
    const recipient = await createRecipient();
    const midway = await createNotification(recipient.id, NotificationType.NEW_ORDER, {
      isRead: true,
      readAt: daysAgo(91),
    });

    await runNotificationRetentionSweep();

    const survivor = await prisma.notification.findUnique({ where: { id: midway.id } });
    expect(survivor).not.toBeNull();
  });

  it("deletes a critical-type notification read more than 180 days ago", async () => {
    const recipient = await createRecipient();
    const old = await createNotification(recipient.id, NotificationType.NEW_ORDER, {
      isRead: true,
      readAt: daysAgo(181),
    });

    await runNotificationRetentionSweep();

    const deleted = await prisma.notification.findUnique({ where: { id: old.id } });
    expect(deleted).toBeNull();
  });
});
