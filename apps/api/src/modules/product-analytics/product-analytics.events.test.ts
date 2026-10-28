import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ORDER_REFUND_OUTCOME } from "#constants/commerce.constants.js";
import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import { FulfilmentStatus, PaymentMethod, UserRole } from "#generated/prisma/enums.js";

import { PRODUCT_ANALYTICS_CONSUMER_GROUP } from "./product-analytics.constants.js";
import { registerProductAnalyticsEventConsumers } from "./product-analytics.events.js";
import { productAnalyticsRepository } from "./product-analytics.repository.js";
import { productAnalyticsService } from "./product-analytics.service.js";

vi.mock("#events/event-bus.consumer.js", () => ({ subscribeToDomainEvent: vi.fn() }));

vi.mock("./product-analytics.service.js", () => ({
  productAnalyticsService: { captureServerEvent: vi.fn() },
}));

vi.mock("./product-analytics.repository.js", () => ({
  productAnalyticsRepository: {
    findOrderAnalyticsSummary: vi.fn(),
    findUserRole: vi.fn(),
    countLookProductTags: vi.fn(),
    findSupportTicketRequesterId: vi.fn(),
  },
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

const { captureServerEvent } = vi.mocked(productAnalyticsService);
const repository = vi.mocked(productAnalyticsRepository);

beforeEach(() => {
  vi.clearAllMocks();
  registerProductAnalyticsEventConsumers();
});

describe("product analytics consumers", () => {
  it("listen on their own consumer group, so a slow PostHog never holds up notifications", () => {
    const groupNames = vi
      .mocked(subscribeToDomainEvent)
      .mock.calls.map(([options]) => options.groupName);

    expect(new Set(groupNames)).toEqual(new Set([PRODUCT_ANALYTICS_CONSUMER_GROUP]));
  });

  it("records a sign-up with its method and role", async () => {
    await handlerFor(DomainEvents.USER_CREATED)(
      { userId: "user-1", email: "a@b.test", role: UserRole.CUSTOMER, signupMethod: "oauth" },
      { eventId: "event-1" },
    );

    expect(captureServerEvent).toHaveBeenCalledWith({
      distinctId: "user-1",
      event: ANALYTICS_EVENTS.USER_CREATE,
      properties: { signup_method: "oauth", user_role: "customer" },
      sourceEventId: "event-1",
    });
    expect(repository.findUserRole).not.toHaveBeenCalled();
  });

  it("looks up the role when the sign-up event didn't carry it", async () => {
    repository.findUserRole.mockResolvedValue(UserRole.BRAND_OWNER);

    await handlerFor(DomainEvents.USER_CREATED)(
      { userId: "user-2", email: "c@d.test", signupMethod: "staff_created" },
      { eventId: "event-2" },
    );

    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: { signup_method: "staff_created", user_role: "brand_owner" },
      }),
    );
  });

  it("records each placed order once, with its details from the database", async () => {
    repository.findOrderAnalyticsSummary.mockResolvedValue({
      orderId: "order-1",
      userId: "user-1",
      total: 3200,
      paymentMethod: PaymentMethod.COD,
      itemQuantity: 2,
      brandCount: 1,
      earlierPlacedOrderCount: 0,
      hasCreatorAttribution: false,
      hasCoupon: true,
    });

    await handlerFor(DomainEvents.PRODUCT_PURCHASED)(
      { orderId: "order-1", userId: "user-1" },
      { eventId: "product.purchased:9-0" },
    );

    expect(captureServerEvent).toHaveBeenCalledWith({
      distinctId: "user-1",
      event: ANALYTICS_EVENTS.ORDER_PLACE,
      properties: {
        order_id: "order-1",
        order_total_npr: 3200,
        cart_item_count: 2,
        brand_count: 1,
        payment_method: "cod",
        is_first_order: true,
        has_creator_attribution: false,
        has_coupon: true,
      },
      sourceEventId: "product.purchased:9-0",
    });
  });

  it("sends nothing for an order that no longer exists", async () => {
    repository.findOrderAnalyticsSummary.mockResolvedValue(null);

    await handlerFor(DomainEvents.PRODUCT_PURCHASED)(
      { orderId: "gone", userId: "user-1" },
      { eventId: "event-3" },
    );

    expect(captureServerEvent).not.toHaveBeenCalled();
  });

  it("records only the status changes that end an order's journey", async () => {
    const statusHandler = handlerFor(DomainEvents.ORDER_STATUS_CHANGED);

    await statusHandler(
      { orderId: "order-1", userId: "user-1", status: FulfilmentStatus.SHIPPED },
      { eventId: "event-4" },
    );
    expect(captureServerEvent).not.toHaveBeenCalled();

    await statusHandler(
      { orderId: "order-1", userId: "user-1", status: FulfilmentStatus.DELIVERED },
      { eventId: "event-5" },
    );
    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: ANALYTICS_EVENTS.ORDER_STATUS_CHANGE,
        properties: { order_id: "order-1", order_status: "delivered" },
      }),
    );
  });

  it("credits a commission to the creator who earned it", async () => {
    await handlerFor(DomainEvents.SALE_GENERATED)(
      { orderItemId: "item-1", creatorId: "creator-1", commissionAmount: 150 },
      { eventId: "event-6" },
    );

    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "creator-1",
        event: ANALYTICS_EVENTS.COMMISSION_EARN,
        properties: { order_item_id: "item-1", commission_amount_npr: 150 },
      }),
    );
  });

  it("counts a new look's product tags", async () => {
    repository.countLookProductTags.mockResolvedValue(4);

    await handlerFor(DomainEvents.LOOK_CREATED)(
      { lookId: "look-1", creatorId: "creator-1", createdAt: "2026-10-28T00:00:00.000Z" },
      { eventId: "event-7" },
    );

    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "creator-1",
        properties: { look_id: "look-1", product_tag_count: 4 },
      }),
    );
  });

  it("records a brand application without a person profile, since no account exists yet", async () => {
    await handlerFor(DomainEvents.BRAND_APPLICATION_SUBMITTED)(
      { applicationId: "app-1", brandName: "Everlane" },
      { eventId: "event-8" },
    );

    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "brand_application:app-1",
        properties: { application_id: "app-1" },
        hasPersonProfile: false,
      }),
    );
  });

  it("attributes a support ticket to its requester, or to the ticket for a guest", async () => {
    const ticketHandler = handlerFor(DomainEvents.SUPPORT_TICKET_CREATED);
    const ticketPayload = {
      ticketId: "ticket-1",
      ticketNumber: 7,
      subject: "Late",
      category: "ORDER",
    };

    repository.findSupportTicketRequesterId.mockResolvedValueOnce("user-1");
    await ticketHandler(ticketPayload, { eventId: "event-9" });
    expect(captureServerEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({ distinctId: "user-1", hasPersonProfile: true }),
    );

    repository.findSupportTicketRequesterId.mockResolvedValueOnce(null);
    await ticketHandler(ticketPayload, { eventId: "event-10" });
    expect(captureServerEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({
        distinctId: "support_ticket:ticket-1",
        properties: { ticket_id: "ticket-1", ticket_category: "order" },
        hasPersonProfile: false,
      }),
    );
  });

  it("records follows of creators and brands by the follower", async () => {
    await handlerFor(DomainEvents.USER_FOLLOWED)(
      { followerId: "user-1", followingId: "creator-1" },
      { eventId: "event-11" },
    );
    await handlerFor(DomainEvents.BRAND_FOLLOWED)(
      { followerId: "user-1", followingId: "brand-1" },
      { eventId: "event-12" },
    );

    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "user-1",
        event: ANALYTICS_EVENTS.CREATOR_FOLLOW,
        properties: { creator_id: "creator-1" },
      }),
    );
    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        distinctId: "user-1",
        event: ANALYTICS_EVENTS.BRAND_FOLLOW,
        properties: { brand_id: "brand-1" },
      }),
    );
  });

  it("records a refund only once the money is actually sent back", async () => {
    const refundHandler = handlerFor(DomainEvents.ORDER_REFUND_UPDATED);
    const refundPayload = {
      orderId: "order-1",
      userId: "user-1",
      refundId: "refund-1",
      amount: 900,
      method: null,
    };

    await refundHandler(
      { ...refundPayload, outcome: ORDER_REFUND_OUTCOME.DETAILS_NEEDED },
      { eventId: "event-17" },
    );
    expect(captureServerEvent).not.toHaveBeenCalled();

    await refundHandler(
      { ...refundPayload, outcome: ORDER_REFUND_OUTCOME.ISSUED },
      { eventId: "event-18" },
    );
    expect(captureServerEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event: ANALYTICS_EVENTS.ORDER_REFUND_ISSUE,
        properties: { order_id: "order-1", refund_amount_npr: 900 },
      }),
    );
  });

  it("records email verification, creator approval and tag approval", async () => {
    await handlerFor(DomainEvents.USER_EMAIL_VERIFIED)(
      { userId: "user-1", email: "a@b.test" },
      { eventId: "event-14" },
    );
    await handlerFor(DomainEvents.CREATOR_APPROVED)({ userId: "user-2" }, { eventId: "event-15" });
    await handlerFor(DomainEvents.PRODUCT_TAG_APPROVED)(
      {
        tagId: "tag-1",
        lookId: "look-1",
        creatorId: "creator-1",
        productId: "product-1",
        auto: true,
      },
      { eventId: "event-16" },
    );

    const capturedEvents = captureServerEvent.mock.calls.map(([serverEvent]) => serverEvent.event);
    expect(capturedEvents).toEqual([
      ANALYTICS_EVENTS.EMAIL_VERIFY,
      ANALYTICS_EVENTS.CREATOR_APPLICATION_APPROVE,
      ANALYTICS_EVENTS.LOOK_PRODUCT_TAG_APPROVE,
    ]);
  });
});
