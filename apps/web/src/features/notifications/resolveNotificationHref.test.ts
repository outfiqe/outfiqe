import type { Notification } from "@outfiqe/types";
import { describe, expect, it } from "vitest";

import { resolveNotificationHref } from "./resolveNotificationHref";

const buildNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: "notif-1",
  recipientId: "user-1",
  actorId: null,
  type: "LOOK_LIKED",
  entityType: null,
  entityId: null,
  metadata: {},
  groupKey: null,
  actorCount: 1,
  isRead: false,
  readAt: null,
  createdAt: "2026-08-22T10:00:00.000Z",
  updatedAt: "2026-08-22T10:00:00.000Z",
  ...overrides,
});

describe("resolveNotificationHref", () => {
  it("routes look likes and comments to the creator's own dashboard profile", () => {
    expect(resolveNotificationHref(buildNotification({ type: "LOOK_LIKED" }))).toBe(
      "/dashboard/profile",
    );
    expect(resolveNotificationHref(buildNotification({ type: "LOOK_COMMENTED" }))).toBe(
      "/dashboard/profile",
    );
  });

  it("routes a new follower to the follower's own profile when a handle is known", () => {
    const notification = buildNotification({
      type: "NEW_FOLLOWER",
      metadata: { recentActors: [{ id: "a1", name: "Jane", handle: "jane", avatarUrl: null }] },
    });
    expect(resolveNotificationHref(notification)).toBe("/creator/jane");
  });

  it("falls back to the dashboard profile for a new follower with no denormalized handle", () => {
    expect(resolveNotificationHref(buildNotification({ type: "NEW_FOLLOWER", metadata: {} }))).toBe(
      "/dashboard/profile",
    );
  });

  it("routes gamification types to their dashboard pages", () => {
    expect(resolveNotificationHref(buildNotification({ type: "ACHIEVEMENT_UNLOCKED" }))).toBe(
      "/dashboard/badges",
    );
    expect(resolveNotificationHref(buildNotification({ type: "LEVEL_UP" }))).toBe(
      "/dashboard/progress",
    );
    expect(resolveNotificationHref(buildNotification({ type: "COMMISSION_EARNED" }))).toBe(
      "/dashboard/earnings",
    );
  });

  it("routes business types to their dashboard pages", () => {
    expect(resolveNotificationHref(buildNotification({ type: "NEW_ORDER" }))).toBe(
      "/dashboard/orders",
    );
    expect(resolveNotificationHref(buildNotification({ type: "NEW_BRAND_FOLLOWER" }))).toBe(
      "/dashboard/profile",
    );
  });

  it("routes an order status change to that order's detail page", () => {
    const notification = buildNotification({ type: "ORDER_STATUS_CHANGED", entityId: "order-9" });
    expect(resolveNotificationHref(notification)).toBe("/orders/order-9");
  });

  it("falls back to the orders list when no entityId is present", () => {
    const notification = buildNotification({ type: "ORDER_STATUS_CHANGED", entityId: null });
    expect(resolveNotificationHref(notification)).toBe("/orders");
  });

  it("returns null for admin-only types", () => {
    expect(
      resolveNotificationHref(buildNotification({ type: "BRAND_APPLICATION_SUBMITTED" })),
    ).toBeNull();
  });
});
