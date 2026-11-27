import { beforeEach, describe, expect, it, vi } from "vitest";

import { ORDER_REFUND_OUTCOME } from "#constants/commerce.constants.js";
import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import {
  FulfilmentStatus,
  NotificationEntityType,
  NotificationType,
} from "#generated/prisma/enums.js";

import { notificationService } from "../notification.service.js";
import { registerCommerceNotificationConsumers } from "./commerce.events.js";

vi.mock("#events/event-bus.consumer.js", () => ({ subscribeToDomainEvent: vi.fn() }));

vi.mock("../notification.service.js", () => ({
  notificationService: { notifyIndividual: vi.fn(), notifyManyIndividual: vi.fn() },
}));

vi.mock("../notification.repository.js", () => ({
  notificationRepository: { findDeliveredOrderProducts: vi.fn() },
}));

type CapturedHandler = (payload: unknown, context: { eventId: string }) => Promise<void>;

const handlerFor = (event: string): CapturedHandler => {
  const subscription = vi
    .mocked(subscribeToDomainEvent)
    .mock.calls.map(([options]) => options)
    .find((options) => options.event === event);
  if (!subscription) throw new Error(`No handler subscribed to ${event}`);
  return subscription.handler as CapturedHandler;
};

const ORDER_ID = "28a55bf3-1111-4222-8333-444455556666";
const ORDER_REFERENCE = "#28A55BF3";

beforeEach(() => {
  vi.clearAllMocks();
  registerCommerceNotificationConsumers();
});

describe("order status notifications", () => {
  it("carry the short order reference shoppers see", async () => {
    await handlerFor(DomainEvents.ORDER_STATUS_CHANGED)(
      { orderId: ORDER_ID, userId: "user-1", status: FulfilmentStatus.SHIPPED },
      { eventId: "event-1" },
    );

    expect(notificationService.notifyIndividual).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.ORDER_STATUS_CHANGED,
        entityType: NotificationEntityType.ORDER,
        metadata: { status: FulfilmentStatus.SHIPPED, orderReference: ORDER_REFERENCE },
      }),
    );
  });
});

describe("order refund notifications", () => {
  const refundEvent = {
    orderId: ORDER_ID,
    userId: "user-1",
    refundId: "refund-1",
    amount: 850,
    outcome: ORDER_REFUND_OUTCOME.DETAILS_NEEDED,
    method: null,
    emptiesOrder: false,
  };

  it("carry the order reference, whether the order is emptied and the product when known", async () => {
    await handlerFor(DomainEvents.ORDER_REFUND_UPDATED)(
      { ...refundEvent, emptiesOrder: true, productName: "Linen Shirt" },
      { eventId: "event-2" },
    );

    expect(notificationService.notifyIndividual).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.ORDER_REFUND_DETAILS_NEEDED,
        metadata: {
          refundId: "refund-1",
          amount: 850,
          method: null,
          orderReference: ORDER_REFERENCE,
          emptiesOrder: true,
          productName: "Linen Shirt",
        },
      }),
    );
  });

  it("leaves the product out when the refund covers several products", async () => {
    await handlerFor(DomainEvents.ORDER_REFUND_UPDATED)(refundEvent, { eventId: "event-3" });

    const [notification] = vi.mocked(notificationService.notifyIndividual).mock.calls[0] ?? [];
    expect(notification?.metadata).not.toHaveProperty("productName");
  });
});
