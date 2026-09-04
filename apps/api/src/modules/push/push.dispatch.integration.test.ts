import { randomUUID } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import type { NotificationBroadcastPayload } from "#events/event-bus.types.js";
import { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";

import { FAILURES_BEFORE_DISABLING_SUBSCRIPTION } from "./push.constants.js";

const sendPushMessage = vi.fn();
const isPushConfigured = vi.fn(() => true);
const isUserOnline = vi.fn(async () => false);

vi.mock("./push.sender.js", () => ({ sendPushMessage, isPushConfigured }));

vi.mock("#socket/socket.presence.js", () => ({ isUserOnline }));

const { pushDispatchService } = await import("./push.dispatch.service.js");

const A_WEDNESDAY_NOON_IN_NEPAL = new Date("2026-01-14T06:15:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(A_WEDNESDAY_NOON_IN_NEPAL);
  sendPushMessage.mockReset().mockResolvedValue({ delivered: true, subscriptionIsGone: false });
  isPushConfigured.mockReturnValue(true);
  isUserOnline.mockResolvedValue(false);
});

afterEach(() => {
  vi.useRealTimers();
});

const createUser = () =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Recipient",
      handle: `push-${randomUUID().slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
    },
  });

const giveUserDevices = (userId: string, count: number) =>
  prisma.pushSubscription.createMany({
    data: Array.from({ length: count }, () => ({
      userId,
      endpoint: `https://push.example.com/${randomUUID()}`,
      p256dhKey: "p256dh",
      authKey: "auth",
    })),
  });

const aNotificationFor = (
  recipientId: string,
  overrides: Partial<NotificationBroadcastPayload> = {},
): NotificationBroadcastPayload => ({
  id: randomUUID(),
  recipientId,
  actorId: randomUUID(),
  type: NotificationType.LOOK_LIKED,
  entityType: NotificationEntityType.LOOK,
  entityId: randomUUID(),
  metadata: {},
  groupKey: null,
  actorCount: 1,
  isRead: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("pushDispatchService.dispatch", () => {
  it("sends the notification to every one of the recipient's devices", async () => {
    const user = await createUser();
    await giveUserDevices(user.id, 3);

    await pushDispatchService.dispatch(aNotificationFor(user.id));

    expect(sendPushMessage).toHaveBeenCalledTimes(3);
  });

  it("does nothing when push is not configured", async () => {
    isPushConfigured.mockReturnValue(false);
    const user = await createUser();
    await giveUserDevices(user.id, 2);

    await pushDispatchService.dispatch(aNotificationFor(user.id));

    expect(sendPushMessage).not.toHaveBeenCalled();
  });

  it("holds a push back while the recipient has the app open", async () => {
    isUserOnline.mockResolvedValue(true);
    const user = await createUser();
    await giveUserDevices(user.id, 1);

    await pushDispatchService.dispatch(aNotificationFor(user.id));

    expect(sendPushMessage).not.toHaveBeenCalled();
  });

  it("stays quiet in the middle of the night in Nepal", async () => {
    vi.setSystemTime(new Date("2026-01-14T18:30:00.000Z"));
    const user = await createUser();
    await giveUserDevices(user.id, 1);

    await pushDispatchService.dispatch(aNotificationFor(user.id));

    expect(sendPushMessage).not.toHaveBeenCalled();
  });

  it("skips a recipient who turned push off for this kind of notification", async () => {
    const user = await createUser();
    await giveUserDevices(user.id, 1);
    await prisma.notificationPreference.create({
      data: { userId: user.id, type: NotificationType.LOOK_LIKED, pushEnabled: false },
    });

    await pushDispatchService.dispatch(aNotificationFor(user.id));

    expect(sendPushMessage).not.toHaveBeenCalled();
  });

  it("still pushes a kind the recipient muted in-app but left push on", async () => {
    const user = await createUser();
    await giveUserDevices(user.id, 1);
    await prisma.notificationPreference.create({
      data: {
        userId: user.id,
        type: NotificationType.LOOK_LIKED,
        enabled: false,
        pushEnabled: true,
      },
    });

    await pushDispatchService.dispatch(aNotificationFor(user.id));

    expect(sendPushMessage).toHaveBeenCalledTimes(1);
  });

  it("forgets a subscription the push service reports as gone", async () => {
    const user = await createUser();
    await giveUserDevices(user.id, 1);
    sendPushMessage.mockResolvedValue({ delivered: false, subscriptionIsGone: true });

    await pushDispatchService.dispatch(aNotificationFor(user.id));

    expect(await prisma.pushSubscription.count({ where: { userId: user.id } })).toBe(0);
  });

  it("counts a plain failure without dropping the subscription", async () => {
    const user = await createUser();
    await giveUserDevices(user.id, 1);
    sendPushMessage.mockResolvedValue({ delivered: false, subscriptionIsGone: false });

    await pushDispatchService.dispatch(aNotificationFor(user.id));

    const subscription = await prisma.pushSubscription.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(subscription.failureCount).toBe(1);
    expect(subscription.disabledAt).toBeNull();
  });

  it("disables a subscription that keeps failing, and then stops sending to it", async () => {
    const user = await createUser();
    await giveUserDevices(user.id, 1);
    sendPushMessage.mockResolvedValue({ delivered: false, subscriptionIsGone: false });

    for (let attempt = 0; attempt < FAILURES_BEFORE_DISABLING_SUBSCRIPTION; attempt += 1) {
      await pushDispatchService.dispatch(aNotificationFor(user.id));
    }

    const subscription = await prisma.pushSubscription.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(subscription.disabledAt).not.toBeNull();

    sendPushMessage.mockClear();
    await pushDispatchService.dispatch(aNotificationFor(user.id));
    expect(sendPushMessage).not.toHaveBeenCalled();
  });

  it("resets the failure count once a device receives a message again", async () => {
    const user = await createUser();
    await giveUserDevices(user.id, 1);

    sendPushMessage.mockResolvedValue({ delivered: false, subscriptionIsGone: false });
    await pushDispatchService.dispatch(aNotificationFor(user.id));

    sendPushMessage.mockResolvedValue({ delivered: true, subscriptionIsGone: false });
    await pushDispatchService.dispatch(aNotificationFor(user.id));

    const subscription = await prisma.pushSubscription.findFirstOrThrow({
      where: { userId: user.id },
    });
    expect(subscription.failureCount).toBe(0);
  });
});
