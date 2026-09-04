import { env } from "#config/env.config.js";
import { PushPlatform } from "#generated/prisma/enums.js";

import { pushRepository } from "./push.repository.js";
import type { RemovePushSubscriptionBody, SavePushSubscriptionBody } from "./push.schemas.js";

export const pushService = {
  getVapidPublicKey(): string | null {
    return env.VAPID_PUBLIC_KEY ?? null;
  },

  async saveSubscription(userId: string, body: SavePushSubscriptionBody): Promise<void> {
    await pushRepository.save({
      userId,
      endpoint: body.endpoint,
      p256dhKey: body.keys.p256dh,
      authKey: body.keys.auth,
      platform: body.platform ?? PushPlatform.OTHER,
      userAgent: body.userAgent ?? null,
    });
  },

  async removeSubscription(userId: string, body: RemovePushSubscriptionBody): Promise<void> {
    await pushRepository.removeForUser(userId, body.endpoint);
  },
};
