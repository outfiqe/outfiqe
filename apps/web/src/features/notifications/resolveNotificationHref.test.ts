import type { Notification } from "@outfiqe/types";
import { describe, expect, it } from "vitest";

import { resolveNotificationHref } from "./resolveNotificationHref";

const OWN_HANDLE = "sabinshrestha0";

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
  it("deep-links look likes, comments, and comment replies to the exact post on the owner's profile", () => {
    const liked = buildNotification({ type: "LOOK_LIKED", entityId: "look-1" });
    expect(resolveNotificationHref(liked, OWN_HANDLE)).toBe(`/creator/${OWN_HANDLE}?look=look-1`);

    const commented = buildNotification({ type: "LOOK_COMMENTED", entityId: "look-2" });
    expect(resolveNotificationHref(commented, OWN_HANDLE)).toBe(
      `/creator/${OWN_HANDLE}?look=look-2`,
    );

    const replied = buildNotification({ type: "COMMENT_REPLIED", entityId: "look-3" });
    expect(resolveNotificationHref(replied, OWN_HANDLE)).toBe(`/creator/${OWN_HANDLE}?look=look-3`);
  });

  it("falls back to the dashboard profile when the own handle or entityId is missing", () => {
    const notification = buildNotification({ type: "LOOK_LIKED", entityId: "look-1" });
    expect(resolveNotificationHref(notification, undefined)).toBe("/dashboard/profile");

    const noEntity = buildNotification({ type: "LOOK_LIKED", entityId: null });
    expect(resolveNotificationHref(noEntity, OWN_HANDLE)).toBe("/dashboard/profile");
  });

  it("routes a new follower to the follower's own profile when a handle is known", () => {
    const notification = buildNotification({
      type: "NEW_FOLLOWER",
      metadata: { recentActors: [{ id: "a1", name: "Jane", handle: "jane", avatarUrl: null }] },
    });
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBe("/creator/jane");
  });

  it("falls back to the dashboard profile for a new follower with no denormalized handle", () => {
    const notification = buildNotification({ type: "NEW_FOLLOWER", metadata: {} });
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBe("/dashboard/profile");
  });

  it("routes gamification types to their dashboard pages", () => {
    expect(
      resolveNotificationHref(buildNotification({ type: "ACHIEVEMENT_UNLOCKED" }), OWN_HANDLE),
    ).toBe("/dashboard/badges");
    expect(resolveNotificationHref(buildNotification({ type: "LEVEL_UP" }), OWN_HANDLE)).toBe(
      "/dashboard/progress",
    );
    expect(
      resolveNotificationHref(buildNotification({ type: "COMMISSION_EARNED" }), OWN_HANDLE),
    ).toBe("/dashboard/earnings");
  });

  it("routes business types to their dashboard pages", () => {
    expect(resolveNotificationHref(buildNotification({ type: "NEW_ORDER" }), OWN_HANDLE)).toBe(
      "/dashboard/orders",
    );
    expect(
      resolveNotificationHref(buildNotification({ type: "NEW_BRAND_FOLLOWER" }), OWN_HANDLE),
    ).toBe("/dashboard/profile");
  });

  it("routes an order status change to that order's detail page", () => {
    const notification = buildNotification({ type: "ORDER_STATUS_CHANGED", entityId: "order-9" });
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBe("/orders/order-9");
  });

  it("falls back to the orders list when no entityId is present", () => {
    const notification = buildNotification({ type: "ORDER_STATUS_CHANGED", entityId: null });
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBe("/orders");
  });

  it("returns null for admin-only types", () => {
    expect(
      resolveNotificationHref(
        buildNotification({ type: "BRAND_APPLICATION_SUBMITTED" }),
        OWN_HANDLE,
      ),
    ).toBeNull();
  });
});
