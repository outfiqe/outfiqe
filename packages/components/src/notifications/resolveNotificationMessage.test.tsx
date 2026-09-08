import type { Notification } from "@outfiqe/types";
import { describe, expect, it } from "vitest";

import { resolveNotificationMessage } from "./resolveNotificationMessage";

const buildNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: "notif-1",
  recipientId: "user-1",
  actorId: null,
  type: "COUPON_APPROVAL_REQUESTED",
  entityType: null,
  entityId: null,
  metadata: {},
  groupKey: null,
  actorCount: 1,
  isRead: false,
  readAt: null,
  createdAt: "2026-09-08T10:00:00.000Z",
  updatedAt: "2026-09-08T10:00:00.000Z",
  ...overrides,
});

describe("resolveNotificationMessage", () => {
  it("names the coupon awaiting approval", () => {
    const message = resolveNotificationMessage(
      buildNotification({ type: "COUPON_APPROVAL_REQUESTED", metadata: { couponCode: "SAVE10" } }),
    );
    expect(message).toBe("SAVE10 is waiting on your approval");
  });

  it("falls back to a generic subject when the coupon code is missing", () => {
    const message = resolveNotificationMessage(
      buildNotification({ type: "COUPON_APPROVAL_REQUESTED" }),
    );
    expect(message).toBe("A coupon is waiting on your approval");
  });

  it("reports the budget threshold when known", () => {
    const message = resolveNotificationMessage(
      buildNotification({
        type: "COUPON_BUDGET_ALERT",
        metadata: { couponCode: "SUMMER", thresholdPercent: 80 },
      }),
    );
    expect(message).toBe("SUMMER has used 80% of its budget");
  });

  it("summarises a flagged coupon redemption", () => {
    const message = resolveNotificationMessage(
      buildNotification({ type: "COUPON_REDEMPTION_FLAGGED" }),
    );
    expect(message).toBe("A coupon redemption was flagged for review");
  });
});
