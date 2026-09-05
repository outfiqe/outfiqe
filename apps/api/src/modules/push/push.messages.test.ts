import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { NotificationBroadcastPayload } from "#events/event-bus.types.js";
import { NotificationEntityType, NotificationType } from "#generated/prisma/enums.js";

import { toPushMessage } from "./push.messages.js";

const aNotification = (
  overrides: Partial<NotificationBroadcastPayload> = {},
): NotificationBroadcastPayload => ({
  id: randomUUID(),
  recipientId: randomUUID(),
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

describe("toPushMessage", () => {
  it("names the single person behind a like", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.LOOK_LIKED, actorCount: 1 }),
    );

    expect(message.title).toBe("New like");
    expect(message.body).toBe("Someone liked your look");
  });

  it("counts the group once more than one person did the same thing", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.NEW_FOLLOWER, actorCount: 4 }),
    );

    expect(message.body).toBe("4 people started following you");
  });

  it("sends a follower notification to the follower's own profile", () => {
    const message = toPushMessage(aNotification({ type: NotificationType.NEW_FOLLOWER }));

    expect(message.url).toBe("/profile");
  });

  it("deep links an order status update to that order", () => {
    const orderId = randomUUID();
    const message = toPushMessage(
      aNotification({ type: NotificationType.ORDER_STATUS_CHANGED, entityId: orderId }),
    );

    expect(message.url).toBe(`/orders/${orderId}`);
  });

  it("falls back to the orders list when an order update has no entity id", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.ORDER_STATUS_CHANGED, entityId: null }),
    );

    expect(message.url).toBe("/orders");
  });

  it("sends a review request straight to the product's review form", () => {
    const productId = randomUUID();
    const message = toPushMessage(
      aNotification({ type: NotificationType.REVIEW_REQUESTED, entityId: productId }),
    );

    expect(message.url).toBe(`/product/${productId}?review=write#reviews`);
  });

  it("sends every withdrawal status to the wallet", () => {
    const approved = toPushMessage(
      aNotification({ type: NotificationType.WITHDRAW_REQUEST_APPROVED }),
    );
    const paid = toPushMessage(aNotification({ type: NotificationType.WITHDRAW_REQUEST_PAID }));

    expect(approved.url).toBe("/wallet");
    expect(paid.url).toBe("/wallet");
  });

  it("falls back to the notification list for a type with no dedicated page", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.BRAND_APPLICATION_SUBMITTED }),
    );

    expect(message.url).toBe("/notifications");
  });

  it("tags by group key first, so repeated likes on one look replace each other", () => {
    const message = toPushMessage(
      aNotification({
        type: NotificationType.LOOK_LIKED,
        groupKey: "look-liked:look-1",
        entityId: "look-1",
      }),
    );

    expect(message.tag).toBe("LOOK_LIKED:look-liked:look-1");
  });

  it("falls back to the entity id for a tag when there is no group", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.LOOK_COMMENTED, groupKey: null, entityId: "look-1" }),
    );

    expect(message.tag).toBe("LOOK_COMMENTED:look-1");
  });

  it("falls back to the notification's own id when there is neither a group nor an entity", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.LEVEL_UP, groupKey: null, entityId: null, id: "n-1" }),
    );

    expect(message.tag).toBe("LEVEL_UP:n-1");
  });

  it("gives every notification type a title and a body", () => {
    for (const type of Object.values(NotificationType)) {
      const message = toPushMessage(aNotification({ type }));

      expect(message.title.length).toBeGreaterThan(0);
      expect(message.body.length).toBeGreaterThan(0);
    }
  });
});
