import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";

import { PUSH_DELIVERY_CONSUMER_GROUP } from "./push.constants.js";
import { pushDispatchService } from "./push.dispatch.service.js";
import { isPushConfigured } from "./push.sender.js";

export const registerPushEventConsumer = (): void => {
  if (!isPushConfigured()) {
    logger.info("Push notifications are not configured (no VAPID keys); delivery is disabled.");
    return;
  }

  subscribeToDomainEvent({
    event: DomainEvents.NOTIFICATION_CREATED,
    groupName: PUSH_DELIVERY_CONSUMER_GROUP,
    handler: (payload) => pushDispatchService.dispatch(payload),
  });
};
