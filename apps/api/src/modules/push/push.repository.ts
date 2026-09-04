import { prisma } from "#db/prisma.js";
import type { PushPlatform } from "#generated/prisma/enums.js";

import {
  FAILURES_BEFORE_DISABLING_SUBSCRIPTION,
  MAX_PUSH_SUBSCRIPTIONS_PER_USER,
} from "./push.constants.js";

export type DeliverablePushSubscription = {
  id: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
};

type SavePushSubscriptionInput = {
  userId: string;
  endpoint: string;
  p256dhKey: string;
  authKey: string;
  platform: PushPlatform;
  userAgent: string | null;
};

const forgetOldestSubscriptionsBeyondCap = async (userId: string): Promise<void> => {
  const survivors = await prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true },
    take: MAX_PUSH_SUBSCRIPTIONS_PER_USER,
  });

  await prisma.pushSubscription.deleteMany({
    where: { userId, id: { notIn: survivors.map((subscription) => subscription.id) } },
  });
};

export const pushRepository = {
  async save(input: SavePushSubscriptionInput): Promise<void> {
    const { userId, endpoint, p256dhKey, authKey, platform, userAgent } = input;
    const now = new Date();

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dhKey, authKey, platform, userAgent },
      update: {
        userId,
        p256dhKey,
        authKey,
        platform,
        userAgent,
        lastSeenAt: now,
        failureCount: 0,
        disabledAt: null,
      },
    });

    await forgetOldestSubscriptionsBeyondCap(userId);
  },

  async removeForUser(userId: string, endpoint: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
  },

  async listDeliverableForUser(userId: string): Promise<DeliverablePushSubscription[]> {
    return prisma.pushSubscription.findMany({
      where: { userId, disabledAt: null },
      select: { id: true, endpoint: true, p256dhKey: true, authKey: true },
    });
  },

  async recordDelivered(subscriptionId: string): Promise<void> {
    await prisma.pushSubscription.updateMany({
      where: { id: subscriptionId },
      data: { lastSeenAt: new Date(), failureCount: 0 },
    });
  },

  async dropSubscription(subscriptionId: string): Promise<void> {
    await prisma.pushSubscription.deleteMany({ where: { id: subscriptionId } });
  },

  async recordFailure(subscriptionId: string): Promise<void> {
    const subscription = await prisma.pushSubscription.update({
      where: { id: subscriptionId },
      data: { failureCount: { increment: 1 } },
      select: { failureCount: true, disabledAt: true },
    });

    if (
      !subscription.disabledAt &&
      subscription.failureCount >= FAILURES_BEFORE_DISABLING_SUBSCRIPTION
    ) {
      await prisma.pushSubscription.update({
        where: { id: subscriptionId },
        data: { disabledAt: new Date() },
      });
    }
  },
};
