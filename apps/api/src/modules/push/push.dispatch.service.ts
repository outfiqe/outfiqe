import type { NotificationBroadcastPayload } from "#events/event-bus.types.js";
import logger from "#lib/winston.utils.js";
import { notificationRepository } from "#modules/notifications/notification.repository.js";
import { describeError } from "#redis/redis.utils.js";
import { isUserOnline } from "#socket/socket.presence.js";

import { toPushMessage } from "./push.messages.js";
import { isWithinQuietHours } from "./push.quiet-hours.js";
import type { DeliverablePushSubscription } from "./push.repository.js";
import { pushRepository } from "./push.repository.js";
import { isPushConfigured, sendPushMessage } from "./push.sender.js";

const deliverToOneDevice = async (
  subscription: DeliverablePushSubscription,
  message: ReturnType<typeof toPushMessage>,
): Promise<void> => {
  const outcome = await sendPushMessage(subscription, message);

  if (outcome.delivered) {
    await pushRepository.recordDelivered(subscription.id);
    return;
  }

  if (outcome.subscriptionIsGone) {
    await pushRepository.dropSubscription(subscription.id);
    return;
  }

  await pushRepository.recordFailure(subscription.id);
};

export const pushDispatchService = {
  async dispatch(notification: NotificationBroadcastPayload): Promise<void> {
    if (!isPushConfigured()) return;
    if (isWithinQuietHours(new Date())) return;

    if (await isUserOnline(notification.recipientId)) return;

    if (
      await notificationRepository.isPushMutedForType(notification.recipientId, notification.type)
    ) {
      return;
    }

    const subscriptions = await pushRepository.listDeliverableForUser(notification.recipientId);
    if (subscriptions.length === 0) return;

    const message = toPushMessage(notification);

    const results = await Promise.allSettled(
      subscriptions.map((subscription) => deliverToOneDevice(subscription, message)),
    );

    for (const result of results) {
      if (result.status === "rejected") {
        logger.error(`Push delivery failed for a device: ${describeError(result.reason)}`);
      }
    }
  },
};
