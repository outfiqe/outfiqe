import type { Notification } from "@outfiqe/types";
import { describe, expect, it } from "vitest";

import {
  isFullPageNavHref,
  resolveNotificationHref,
  resolveNotificationNavigation,
} from "./resolveNotificationHref";

const OWN_HANDLE = "sabinshrestha0";

const buildNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: "notif-1",
  recipientId: "user-1",
  actorId: null,
  type: "LOOK_LIKED",
  entityType: null,
  entityId: null,
  targetSurface: null,
  targetPath: null,
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
  it("deep-links likes and comments on your own look to that post on your profile", () => {
    const liked = buildNotification({ type: "LOOK_LIKED", entityId: "look-1" });
    expect(resolveNotificationHref(liked, OWN_HANDLE)).toBe(`/creator/${OWN_HANDLE}?look=look-1`);

    const commented = buildNotification({ type: "LOOK_COMMENTED", entityId: "look-2" });
    expect(resolveNotificationHref(commented, OWN_HANDLE)).toBe(
      `/creator/${OWN_HANDLE}?look=look-2`,
    );
  });

  it("deep-links a comment reply to the post on the look owner's profile, not the viewer's", () => {
    const replied = buildNotification({
      type: "COMMENT_REPLIED",
      entityId: "look-3",
      metadata: { lookOwnerHandle: "munkhatiwada" },
    });
    expect(resolveNotificationHref(replied, OWN_HANDLE)).toBe("/creator/munkhatiwada?look=look-3");
  });

  it("falls back to the replier's handle for a comment reply with no stored look owner", () => {
    const replied = buildNotification({
      type: "COMMENT_REPLIED",
      entityId: "look-3",
      metadata: { actor: { id: "a1", name: "Mun", handle: "mun", avatarUrl: null } },
    });
    expect(resolveNotificationHref(replied, OWN_HANDLE)).toBe("/creator/mun?look=look-3");
  });

  it("falls back to the dashboard profile for a comment reply with no creator handle at all", () => {
    const replied = buildNotification({ type: "COMMENT_REPLIED", entityId: "look-3" });
    expect(resolveNotificationHref(replied, OWN_HANDLE)).toBe("/profile");
  });

  it("falls back to the dashboard profile when the own handle or entityId is missing", () => {
    const notification = buildNotification({ type: "LOOK_LIKED", entityId: "look-1" });
    expect(resolveNotificationHref(notification, undefined)).toBe("/profile");

    const noEntity = buildNotification({ type: "LOOK_LIKED", entityId: null });
    expect(resolveNotificationHref(noEntity, OWN_HANDLE)).toBe("/profile");
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
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBe("/profile");
  });

  it("routes gamification types to their dashboard pages", () => {
    expect(
      resolveNotificationHref(buildNotification({ type: "ACHIEVEMENT_UNLOCKED" }), OWN_HANDLE),
    ).toBe("/badges");
    expect(resolveNotificationHref(buildNotification({ type: "LEVEL_UP" }), OWN_HANDLE)).toBe(
      "/progress",
    );
    expect(
      resolveNotificationHref(buildNotification({ type: "COMMISSION_EARNED" }), OWN_HANDLE),
    ).toBe("/earnings");
  });

  it("routes business types to their dashboard pages", () => {
    expect(resolveNotificationHref(buildNotification({ type: "NEW_ORDER" }), OWN_HANDLE)).toBe(
      "/manage-orders",
    );
    expect(
      resolveNotificationHref(buildNotification({ type: "NEW_BRAND_FOLLOWER" }), OWN_HANDLE),
    ).toBe("/profile");
  });

  it("routes an order status change to that order's detail page", () => {
    const notification = buildNotification({ type: "ORDER_STATUS_CHANGED", entityId: "order-9" });
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBe("/orders/order-9");
  });

  it("falls back to the orders list when no entityId is present", () => {
    const notification = buildNotification({ type: "ORDER_STATUS_CHANGED", entityId: null });
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBe("/orders");
  });

  it("routes staff-only types into the admin app", () => {
    expect(
      resolveNotificationHref(
        buildNotification({ type: "BRAND_APPLICATION_SUBMITTED" }),
        OWN_HANDLE,
      ),
    ).toBe("/admin/platform/brand-applications");

    expect(
      resolveNotificationHref(
        buildNotification({ type: "SUPPORT_TICKET_CREATED", entityId: "ticket-9" }),
        OWN_HANDLE,
      ),
    ).toBe("/admin/support/ticket-9");

    expect(
      resolveNotificationHref(
        buildNotification({ type: "SUPPORT_TICKET_ASSIGNED", entityId: null }),
        OWN_HANDLE,
      ),
    ).toBe("/admin/support");
  });

  it("routes a CRM assignment into the admin app by item kind", () => {
    expect(
      resolveNotificationHref(
        buildNotification({ type: "CRM_ITEM_ASSIGNED", metadata: { crmItemKind: "task" } }),
        OWN_HANDLE,
      ),
    ).toBe("/admin/crm/tasks");

    expect(
      resolveNotificationHref(
        buildNotification({ type: "CRM_ITEM_ASSIGNED", metadata: { crmItemKind: "ticket" } }),
        OWN_HANDLE,
      ),
    ).toBe("/admin/crm/support");
  });

  it("routes coupon alerts into the admin app", () => {
    expect(
      resolveNotificationHref(
        buildNotification({
          type: "COUPON_APPROVAL_REQUESTED",
          metadata: { couponCode: "SAVE10" },
        }),
        OWN_HANDLE,
      ),
    ).toBe("/admin/coupons");

    expect(
      resolveNotificationHref(buildNotification({ type: "COUPON_BUDGET_ALERT" }), OWN_HANDLE),
    ).toBe("/admin/coupons");

    expect(
      resolveNotificationHref(
        buildNotification({ type: "COUPON_REDEMPTION_FLAGGED", entityId: "order-4" }),
        OWN_HANDLE,
      ),
    ).toBe("/admin/orders/order-4");
  });

  it("routes a new product review to the brand's product dashboard", () => {
    expect(
      resolveNotificationHref(buildNotification({ type: "PRODUCT_REVIEWED" }), OWN_HANDLE),
    ).toBe("/products");
  });

  it("deep-links a review request straight to the product's review section", () => {
    const notification = buildNotification({ type: "REVIEW_REQUESTED", entityId: "product-1" });
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBe(
      "/product/product-1?review=write#reviews",
    );
  });

  it("falls back to null for a review request with no entityId", () => {
    const notification = buildNotification({ type: "REVIEW_REQUESTED", entityId: null });
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBeNull();
  });

  it("routes withdrawal request updates to the wallet", () => {
    expect(
      resolveNotificationHref(buildNotification({ type: "WITHDRAW_REQUEST_APPROVED" }), OWN_HANDLE),
    ).toBe("/wallet");
    expect(
      resolveNotificationHref(buildNotification({ type: "WITHDRAW_REQUEST_REJECTED" }), OWN_HANDLE),
    ).toBe("/wallet");
    expect(
      resolveNotificationHref(buildNotification({ type: "WITHDRAW_REQUEST_PAID" }), OWN_HANDLE),
    ).toBe("/wallet");
  });

  it("deep-links a new message to its conversation", () => {
    const notification = buildNotification({ type: "NEW_MESSAGE", entityId: "conversation-1" });
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBe("/messages/conversation-1");
  });

  it("falls back to the messages list when a new-message notification has no entityId", () => {
    const notification = buildNotification({ type: "NEW_MESSAGE", entityId: null });
    expect(resolveNotificationHref(notification, OWN_HANDLE)).toBe("/messages");
  });

  it("sends a customer's support ticket reply or resolution to the customer support page", () => {
    const replied = buildNotification({ type: "SUPPORT_TICKET_REPLY", entityId: "ticket-1" });
    expect(resolveNotificationHref(replied, OWN_HANDLE)).toBe("/support?ticket=ticket-1");

    const resolved = buildNotification({ type: "SUPPORT_TICKET_RESOLVED", entityId: null });
    expect(resolveNotificationHref(resolved, OWN_HANDLE)).toBe("/support");
  });

  it("sends an admin's support ticket reply or resolution to the admin ticket view", () => {
    const replied = buildNotification({ type: "SUPPORT_TICKET_REPLY", entityId: "ticket-1" });
    expect(resolveNotificationHref(replied, OWN_HANDLE, true)).toBe("/admin/support/ticket-1");

    const resolved = buildNotification({ type: "SUPPORT_TICKET_RESOLVED", entityId: null });
    expect(resolveNotificationHref(resolved, OWN_HANDLE, true)).toBe("/admin/support");
  });
});

describe("resolveNotificationNavigation", () => {
  it("uses the server-authored target path for a web-surface notification (client nav)", () => {
    const notification = buildNotification({
      type: "NEW_MESSAGE",
      targetSurface: "WEB",
      targetPath: "/messages/conversation-1",
    });
    expect(resolveNotificationNavigation(notification, OWN_HANDLE, true)).toEqual({
      href: "/messages/conversation-1",
      fullPage: false,
    });
  });

  it("prefixes an admin-surface target with the admin origin and forces a full page nav", () => {
    const notification = buildNotification({
      type: "BRAND_APPLICATION_SUBMITTED",
      targetSurface: "ADMIN",
      targetPath: "/platform/brand-applications",
    });
    expect(resolveNotificationNavigation(notification, OWN_HANDLE, true)).toEqual({
      href: "/admin/platform/brand-applications",
      fullPage: true,
    });
  });

  it("falls back to the legacy type resolver when no target path is stored", () => {
    const legacy = buildNotification({ type: "ACHIEVEMENT_UNLOCKED" });
    expect(resolveNotificationNavigation(legacy, OWN_HANDLE, false)).toEqual({
      href: "/badges",
      fullPage: false,
    });

    const staffLegacy = buildNotification({
      type: "SUPPORT_TICKET_CREATED",
      entityId: "ticket-1",
    });
    expect(resolveNotificationNavigation(staffLegacy, OWN_HANDLE, true)).toEqual({
      href: "/admin/support/ticket-1",
      fullPage: true,
    });
  });

  it("returns null when neither a target path nor a legacy route resolves", () => {
    const notification = buildNotification({ type: "REVIEW_REQUESTED", entityId: null });
    expect(resolveNotificationNavigation(notification, OWN_HANDLE, false)).toBeNull();
  });
});

describe("isFullPageNavHref", () => {
  it("flags cross-origin and admin-app hrefs for a full page navigation", () => {
    expect(isFullPageNavHref("https://admin.outfiqe.com/support/ticket-1")).toBe(true);
    expect(isFullPageNavHref("/admin/coupons")).toBe(true);
    expect(isFullPageNavHref("/admin")).toBe(true);
  });

  it("leaves in-app router paths for a client-side navigation", () => {
    expect(isFullPageNavHref("/profile")).toBe(false);
    expect(isFullPageNavHref("/orders/order-9")).toBe(false);
    expect(isFullPageNavHref("/support?ticket=ticket-1")).toBe(false);
  });
});
