import { beforeEach, describe, expect, it, vi } from "vitest";

import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { NotificationType } from "#generated/prisma/enums.js";

import { ApprovedAccountKind } from "./notification.constants.js";
import { registerNotificationEventConsumers } from "./notification.events.js";
import { notificationRepository } from "./notification.repository.js";
import { notificationService } from "./notification.service.js";

vi.mock("#events/event-bus.consumer.js", () => ({ subscribeToDomainEvent: vi.fn() }));

vi.mock("./notification.service.js", () => ({
  notificationService: { notifyIndividual: vi.fn() },
}));

vi.mock("./notification.repository.js", () => ({
  notificationRepository: { findBrandName: vi.fn() },
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

describe("account-approved welcome notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registerNotificationEventConsumers();
  });

  it("welcomes a muse the moment they're approved", async () => {
    await handlerFor(DomainEvents.CREATOR_APPROVED)({ userId: "user-1" }, { eventId: "event-1" });

    expect(notificationService.notifyIndividual).toHaveBeenCalledWith({
      recipientId: "user-1",
      type: NotificationType.ACCOUNT_APPROVED,
      sourceEventId: "event-1",
      metadata: { approvedAccountKind: ApprovedAccountKind.CREATOR },
    });
  });

  it("welcomes a brand owner by brand name once they finish registering", async () => {
    vi.mocked(notificationRepository.findBrandName).mockResolvedValue("Meridian Apparel");

    await handlerFor(DomainEvents.BRAND_OWNER_REGISTERED)(
      { userId: "owner-1", brandId: "brand-1", email: "owner@meridian.test" },
      { eventId: "event-2" },
    );

    expect(notificationRepository.findBrandName).toHaveBeenCalledWith("brand-1");
    expect(notificationService.notifyIndividual).toHaveBeenCalledWith({
      recipientId: "owner-1",
      type: NotificationType.ACCOUNT_APPROVED,
      sourceEventId: "event-2",
      metadata: { approvedAccountKind: ApprovedAccountKind.BRAND, brandName: "Meridian Apparel" },
    });
  });

  it("still welcomes a brand owner when the brand can't be found", async () => {
    vi.mocked(notificationRepository.findBrandName).mockResolvedValue(null);

    await handlerFor(DomainEvents.BRAND_OWNER_REGISTERED)(
      { userId: "owner-2", brandId: "missing-brand", email: "owner@missing.test" },
      { eventId: "event-3" },
    );

    expect(notificationService.notifyIndividual).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: "owner-2",
        metadata: { approvedAccountKind: ApprovedAccountKind.BRAND },
      }),
    );
  });
});
