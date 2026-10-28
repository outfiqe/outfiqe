import { ANALYTICS_EVENTS } from "@outfiqe/utils";

import { ORDER_REFUND_OUTCOME } from "#constants/commerce.constants.js";
import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";

import {
  ANONYMOUS_DISTINCT_ID_PREFIX,
  PRODUCT_ANALYTICS_CONSUMER_GROUP,
} from "./product-analytics.constants.js";
import { productAnalyticsRepository } from "./product-analytics.repository.js";
import { productAnalyticsService } from "./product-analytics.service.js";
import { toOrderPlacedProperties, toTrackedOrderStatus } from "./product-analytics.utils.js";

const { captureServerEvent } = productAnalyticsService;

const registerAccountAnalyticsConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.USER_CREATED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ userId, role, signupMethod }, { eventId }) => {
      const userRole = role ?? (await productAnalyticsRepository.findUserRole(userId));
      if (!userRole) return;
      captureServerEvent({
        distinctId: userId,
        event: ANALYTICS_EVENTS.USER_CREATE,
        properties: { signup_method: signupMethod, user_role: userRole.toLowerCase() },
        sourceEventId: eventId,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.USER_EMAIL_VERIFIED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ userId }, { eventId }) => {
      captureServerEvent({
        distinctId: userId,
        event: ANALYTICS_EVENTS.EMAIL_VERIFY,
        properties: {},
        sourceEventId: eventId,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.CREATOR_APPROVED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ userId }, { eventId }) => {
      captureServerEvent({
        distinctId: userId,
        event: ANALYTICS_EVENTS.CREATOR_APPLICATION_APPROVE,
        properties: {},
        sourceEventId: eventId,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.BRAND_APPLICATION_SUBMITTED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ applicationId }, { eventId }) => {
      captureServerEvent({
        distinctId: `${ANONYMOUS_DISTINCT_ID_PREFIX.BRAND_APPLICATION}:${applicationId}`,
        event: ANALYTICS_EVENTS.BRAND_APPLICATION_SUBMIT,
        properties: { application_id: applicationId },
        sourceEventId: eventId,
        hasPersonProfile: false,
      });
    },
  });
};

const registerCommerceAnalyticsConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_PURCHASED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ orderId }, { eventId }) => {
      const summary = await productAnalyticsRepository.findOrderAnalyticsSummary(orderId);
      if (!summary) return;
      const properties = toOrderPlacedProperties(summary);
      if (!properties) return;
      captureServerEvent({
        distinctId: summary.userId,
        event: ANALYTICS_EVENTS.ORDER_PLACE,
        properties,
        sourceEventId: eventId,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.ORDER_STATUS_CHANGED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ orderId, userId, status }, { eventId }) => {
      const orderStatus = toTrackedOrderStatus(status);
      if (!orderStatus) return;
      captureServerEvent({
        distinctId: userId,
        event: ANALYTICS_EVENTS.ORDER_STATUS_CHANGE,
        properties: { order_id: orderId, order_status: orderStatus },
        sourceEventId: eventId,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.ORDER_REFUND_UPDATED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ orderId, userId, amount, outcome }, { eventId }) => {
      if (outcome !== ORDER_REFUND_OUTCOME.ISSUED) return;
      captureServerEvent({
        distinctId: userId,
        event: ANALYTICS_EVENTS.ORDER_REFUND_ISSUE,
        properties: { order_id: orderId, refund_amount_npr: amount },
        sourceEventId: eventId,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.SALE_GENERATED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ orderItemId, creatorId, commissionAmount }, { eventId }) => {
      captureServerEvent({
        distinctId: creatorId,
        event: ANALYTICS_EVENTS.COMMISSION_EARN,
        properties: { order_item_id: orderItemId, commission_amount_npr: commissionAmount },
        sourceEventId: eventId,
      });
    },
  });
};

const registerCreatorAnalyticsConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.LOOK_CREATED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId }, { eventId }) => {
      const productTagCount = await productAnalyticsRepository.countLookProductTags(lookId);
      captureServerEvent({
        distinctId: creatorId,
        event: ANALYTICS_EVENTS.LOOK_POST_CREATE,
        properties: { look_id: lookId, product_tag_count: productTagCount },
        sourceEventId: eventId,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.PRODUCT_TAG_APPROVED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ lookId, creatorId, productId }, { eventId }) => {
      captureServerEvent({
        distinctId: creatorId,
        event: ANALYTICS_EVENTS.LOOK_PRODUCT_TAG_APPROVE,
        properties: { look_id: lookId, product_id: productId, creator_id: creatorId },
        sourceEventId: eventId,
      });
    },
  });
};

const registerSocialAnalyticsConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.USER_FOLLOWED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ followerId, followingId }, { eventId }) => {
      captureServerEvent({
        distinctId: followerId,
        event: ANALYTICS_EVENTS.CREATOR_FOLLOW,
        properties: { creator_id: followingId },
        sourceEventId: eventId,
      });
    },
  });

  subscribeToDomainEvent({
    event: DomainEvents.BRAND_FOLLOWED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ followerId, followingId }, { eventId }) => {
      captureServerEvent({
        distinctId: followerId,
        event: ANALYTICS_EVENTS.BRAND_FOLLOW,
        properties: { brand_id: followingId },
        sourceEventId: eventId,
      });
    },
  });
};

const registerSupportAnalyticsConsumers = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.SUPPORT_TICKET_CREATED,
    groupName: PRODUCT_ANALYTICS_CONSUMER_GROUP,
    handler: async ({ ticketId, category }, { eventId }) => {
      const requesterId = await productAnalyticsRepository.findSupportTicketRequesterId(ticketId);
      captureServerEvent({
        distinctId: requesterId ?? `${ANONYMOUS_DISTINCT_ID_PREFIX.SUPPORT_TICKET}:${ticketId}`,
        event: ANALYTICS_EVENTS.SUPPORT_TICKET_CREATE,
        properties: { ticket_id: ticketId, ticket_category: category.toLowerCase() },
        sourceEventId: eventId,
        hasPersonProfile: requesterId !== null,
      });
    },
  });
};

export const registerProductAnalyticsEventConsumers = (): void => {
  registerAccountAnalyticsConsumers();
  registerCommerceAnalyticsConsumers();
  registerCreatorAnalyticsConsumers();
  registerSocialAnalyticsConsumers();
  registerSupportAnalyticsConsumers();
};
