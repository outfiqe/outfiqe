import { prisma } from "#db/prisma.js";
import type { PushPlatform } from "#generated/prisma/enums.js";

import { MAX_PUSH_SUBSCRIPTIONS_PER_USER } from "./push.constants.js";

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
};
