import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { NotificationEntityType, NotificationType, UserRole } from "#generated/prisma/enums.js";

import { notificationService } from "./notification.service.js";

const createUser = async (overrides: Partial<{ role: UserRole }> = {}) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `notif-${suffix}@outfiqe.test`,
      name: `Notif Test ${suffix}`,
      handle: `notif-test-${suffix}`,
      phone: `96${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: overrides.role ?? UserRole.CUSTOMER,
    },
  });
};

const actorSnapshotFor = (user: { id: string; name: string; handle: string }) => ({
  id: user.id,
  name: user.name,
  handle: user.handle,
  avatarUrl: null,
});

describe("notificationService.notifyIndividual", () => {
  it("writes a row for the recipient", async () => {
    const recipient = await createUser();

    await notificationService.notifyIndividual({
      recipientId: recipient.id,
      type: NotificationType.LEVEL_UP,
      metadata: { levelName: "Rising Star", levelIcon: null },
    });

    const rows = await prisma.notification.findMany({ where: { recipientId: recipient.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: NotificationType.LEVEL_UP,
      isRead: false,
      actorCount: 1,
    });
  });

  it("does not notify a user about their own action", async () => {
    const user = await createUser();

    await notificationService.notifyIndividual({
      recipientId: user.id,
      actorId: user.id,
      type: NotificationType.LOOK_COMMENTED,
      metadata: {},
    });

    const rows = await prisma.notification.findMany({ where: { recipientId: user.id } });
    expect(rows).toHaveLength(0);
  });

  it("skips a since-deleted recipient instead of throwing (e.g. a consumer replaying stream history)", async () => {
    await expect(
      notificationService.notifyIndividual({
        recipientId: randomUUID(),
        type: NotificationType.LEVEL_UP,
        metadata: {},
      }),
    ).resolves.toBeUndefined();
  });

  it("skips a recipient who muted this notification type", async () => {
    const recipient = await createUser();
    await prisma.notificationPreference.create({
      data: { userId: recipient.id, type: NotificationType.LEVEL_UP, enabled: false },
    });

    await notificationService.notifyIndividual({
      recipientId: recipient.id,
      type: NotificationType.LEVEL_UP,
      metadata: {},
    });

    const rows = await prisma.notification.findMany({ where: { recipientId: recipient.id } });
    expect(rows).toHaveLength(0);
  });
});

describe("notificationService.notifyGroup", () => {
  it("skips a since-deleted recipient instead of throwing", async () => {
    const actor = await createUser();
    const lookId = randomUUID();

    await expect(
      notificationService.notifyGroup({
        recipientId: randomUUID(),
        actorId: actor.id,
        actor: actorSnapshotFor(actor),
        type: NotificationType.LOOK_LIKED,
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        groupKey: `look-liked:${lookId}`,
        metadata: {},
      }),
    ).resolves.toBeUndefined();
  });

  it("collapses two concurrent actors on the same group into one row with actorCount 2", async () => {
    const recipient = await createUser();
    const [actorA, actorB] = await Promise.all([createUser(), createUser()]);
    if (!actorA || !actorB) throw new Error("expected two actors");

    const lookId = randomUUID();
    const groupKey = `look-liked:${lookId}`;

    await Promise.all([
      notificationService.notifyGroup({
        recipientId: recipient.id,
        actorId: actorA.id,
        actor: actorSnapshotFor(actorA),
        type: NotificationType.LOOK_LIKED,
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        groupKey,
        metadata: {},
      }),
      notificationService.notifyGroup({
        recipientId: recipient.id,
        actorId: actorB.id,
        actor: actorSnapshotFor(actorB),
        type: NotificationType.LOOK_LIKED,
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        groupKey,
        metadata: {},
      }),
    ]);

    const rows = await prisma.notification.findMany({
      where: { recipientId: recipient.id, groupKey },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actorCount).toBe(2);

    const metadata = rows[0]?.metadata as { recentActors?: { id: string }[] };
    const recentActorIds = metadata.recentActors?.map((actor) => actor.id) ?? [];
    expect(recentActorIds).toContain(actorA.id);
    expect(recentActorIds).toContain(actorB.id);
  });

  it("starts a new group once the previous one is read", async () => {
    const recipient = await createUser();
    const actor = await createUser();
    const lookId = randomUUID();
    const groupKey = `look-liked:${lookId}`;

    await notificationService.notifyGroup({
      recipientId: recipient.id,
      actorId: actor.id,
      actor: actorSnapshotFor(actor),
      type: NotificationType.LOOK_LIKED,
      entityType: NotificationEntityType.LOOK,
      entityId: lookId,
      groupKey,
      metadata: {},
    });

    await prisma.notification.updateMany({
      where: { recipientId: recipient.id, groupKey },
      data: { isRead: true, readAt: new Date() },
    });

    const secondActor = await createUser();
    await notificationService.notifyGroup({
      recipientId: recipient.id,
      actorId: secondActor.id,
      actor: actorSnapshotFor(secondActor),
      type: NotificationType.LOOK_LIKED,
      entityType: NotificationEntityType.LOOK,
      entityId: lookId,
      groupKey,
      metadata: {},
    });

    const rows = await prisma.notification.findMany({
      where: { recipientId: recipient.id, groupKey },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[1]?.actorCount).toBe(1);
  });
});

describe("notificationService.retractGroupActor", () => {
  it("decrements actorCount when the group still has other actors", async () => {
    const recipient = await createUser();
    const [actorA, actorB] = await Promise.all([createUser(), createUser()]);
    if (!actorA || !actorB) throw new Error("expected two actors");

    const lookId = randomUUID();
    const groupKey = `look-liked:${lookId}`;

    for (const actor of [actorA, actorB]) {
      await notificationService.notifyGroup({
        recipientId: recipient.id,
        actorId: actor.id,
        actor: actorSnapshotFor(actor),
        type: NotificationType.LOOK_LIKED,
        entityType: NotificationEntityType.LOOK,
        entityId: lookId,
        groupKey,
        metadata: {},
      });
    }

    await notificationService.retractGroupActor({
      recipientId: recipient.id,
      groupKey,
      actorId: actorA.id,
    });

    const rows = await prisma.notification.findMany({
      where: { recipientId: recipient.id, groupKey },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actorCount).toBe(1);
  });

  it("deletes the row once the last actor is retracted", async () => {
    const recipient = await createUser();
    const actor = await createUser();
    const lookId = randomUUID();
    const groupKey = `look-liked:${lookId}`;

    await notificationService.notifyGroup({
      recipientId: recipient.id,
      actorId: actor.id,
      actor: actorSnapshotFor(actor),
      type: NotificationType.LOOK_LIKED,
      entityType: NotificationEntityType.LOOK,
      entityId: lookId,
      groupKey,
      metadata: {},
    });

    await notificationService.retractGroupActor({
      recipientId: recipient.id,
      groupKey,
      actorId: actor.id,
    });

    const rows = await prisma.notification.findMany({
      where: { recipientId: recipient.id, groupKey },
    });
    expect(rows).toHaveLength(0);
  });
});

describe("notificationService.notifyManyIndividual", () => {
  it("writes a row per recipient and skips muted recipients", async () => {
    const [recipientA, recipientB] = await Promise.all([createUser(), createUser()]);
    if (!recipientA || !recipientB) throw new Error("expected two recipients");

    await prisma.notificationPreference.create({
      data: {
        userId: recipientB.id,
        type: NotificationType.BRAND_APPLICATION_SUBMITTED,
        enabled: false,
      },
    });

    await notificationService.notifyManyIndividual([
      {
        recipientId: recipientA.id,
        type: NotificationType.BRAND_APPLICATION_SUBMITTED,
        entityType: NotificationEntityType.BRAND_APPLICATION,
        entityId: randomUUID(),
        metadata: { brandName: "Test Atelier" },
      },
      {
        recipientId: recipientB.id,
        type: NotificationType.BRAND_APPLICATION_SUBMITTED,
        entityType: NotificationEntityType.BRAND_APPLICATION,
        entityId: randomUUID(),
        metadata: { brandName: "Test Atelier" },
      },
    ]);

    const [rowsA, rowsB] = await Promise.all([
      prisma.notification.findMany({ where: { recipientId: recipientA.id } }),
      prisma.notification.findMany({ where: { recipientId: recipientB.id } }),
    ]);
    expect(rowsA).toHaveLength(1);
    expect(rowsB).toHaveLength(0);
  });
});
