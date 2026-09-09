import { describe, expect, it } from "vitest";

import { NotificationSurface, NotificationType } from "#generated/prisma/enums.js";

import { resolveNotificationTarget } from "./notification.targets.js";
import type { NotificationMetadata } from "./notification.types.js";

const resolve = (
  type: NotificationType,
  entityId: string | null = null,
  metadata: NotificationMetadata = {},
  recipientIsStaff = false,
) => resolveNotificationTarget({ type, entityId, metadata, recipientIsStaff });

describe("resolveNotificationTarget", () => {
  it("deep-links a like or comment on your own look to that post on your profile", () => {
    expect(resolve(NotificationType.LOOK_LIKED, "look-1", { lookOwnerHandle: "mun" })).toEqual({
      surface: NotificationSurface.WEB,
      path: "/creator/mun?look=look-1",
    });

    expect(resolve(NotificationType.LOOK_COMMENTED, "look-2", { lookOwnerHandle: "mun" })).toEqual({
      surface: NotificationSurface.WEB,
      path: "/creator/mun?look=look-2",
    });
  });

  it("deep-links a comment reply to the look owner's post", () => {
    expect(
      resolve(NotificationType.COMMENT_REPLIED, "look-3", { lookOwnerHandle: "jane" }),
    ).toEqual({ surface: NotificationSurface.WEB, path: "/creator/jane?look=look-3" });
  });

  it("falls back to the dashboard profile for a look notification with no owner handle", () => {
    expect(resolve(NotificationType.LOOK_LIKED, "look-1")).toEqual({
      surface: NotificationSurface.WEB,
      path: "/profile",
    });
  });

  it("routes a new follower who is a creator to their creator profile", () => {
    expect(
      resolve(NotificationType.NEW_FOLLOWER, "u1", {
        recentActors: [
          { id: "u1", name: "Jane", handle: "jane", avatarUrl: null, isCreator: true },
        ],
      }),
    ).toEqual({ surface: NotificationSurface.WEB, path: "/creator/jane" });
  });

  it("routes a new follower who has no creator profile to the dashboard profile", () => {
    expect(
      resolve(NotificationType.NEW_FOLLOWER, "u1", {
        recentActors: [
          {
            id: "u1",
            name: "Peak Studio",
            handle: "peak-studio",
            avatarUrl: null,
            isCreator: false,
          },
        ],
      }),
    ).toEqual({ surface: NotificationSurface.WEB, path: "/profile" });
  });

  it("routes gamification, commission and order types to their web dashboard pages", () => {
    expect(resolve(NotificationType.ACHIEVEMENT_UNLOCKED)).toEqual({
      surface: NotificationSurface.WEB,
      path: "/badges",
    });
    expect(resolve(NotificationType.LEVEL_UP)).toEqual({
      surface: NotificationSurface.WEB,
      path: "/progress",
    });
    expect(resolve(NotificationType.COMMISSION_EARNED)).toEqual({
      surface: NotificationSurface.WEB,
      path: "/earnings",
    });
    expect(resolve(NotificationType.NEW_ORDER)).toEqual({
      surface: NotificationSurface.WEB,
      path: "/manage-orders",
    });
    expect(resolve(NotificationType.ORDER_STATUS_CHANGED, "order-9")).toEqual({
      surface: NotificationSurface.WEB,
      path: "/orders/order-9",
    });
    expect(resolve(NotificationType.WITHDRAW_REQUEST_PAID)).toEqual({
      surface: NotificationSurface.WEB,
      path: "/wallet",
    });
  });

  it("deep-links a new message to its conversation", () => {
    expect(resolve(NotificationType.NEW_MESSAGE, "conversation-1")).toEqual({
      surface: NotificationSurface.WEB,
      path: "/messages/conversation-1",
    });
    expect(resolve(NotificationType.NEW_MESSAGE, null)).toEqual({
      surface: NotificationSurface.WEB,
      path: "/messages",
    });
  });

  it("routes staff-only types into the admin app", () => {
    expect(resolve(NotificationType.BRAND_APPLICATION_SUBMITTED)).toEqual({
      surface: NotificationSurface.ADMIN,
      path: "/platform/brand-applications",
    });
    expect(resolve(NotificationType.SUPPORT_TICKET_CREATED, "ticket-9")).toEqual({
      surface: NotificationSurface.ADMIN,
      path: "/support/ticket-9",
    });
    expect(resolve(NotificationType.CRM_ITEM_ASSIGNED, "task-1", { crmItemKind: "task" })).toEqual({
      surface: NotificationSurface.ADMIN,
      path: "/crm/tasks",
    });
    expect(
      resolve(NotificationType.CRM_ITEM_ASSIGNED, "ticket-1", { crmItemKind: "ticket" }),
    ).toEqual({ surface: NotificationSurface.ADMIN, path: "/crm/support" });
    expect(resolve(NotificationType.COUPON_APPROVAL_REQUESTED)).toEqual({
      surface: NotificationSurface.ADMIN,
      path: "/coupons",
    });
    expect(resolve(NotificationType.COUPON_REDEMPTION_FLAGGED, "order-4")).toEqual({
      surface: NotificationSurface.ADMIN,
      path: "/orders/order-4",
    });
  });

  it("branches a support ticket reply by whether the recipient is staff", () => {
    expect(resolve(NotificationType.SUPPORT_TICKET_REPLY, "ticket-1", {}, true)).toEqual({
      surface: NotificationSurface.ADMIN,
      path: "/support/ticket-1",
    });
    expect(resolve(NotificationType.SUPPORT_TICKET_REPLY, "ticket-1", {}, false)).toEqual({
      surface: NotificationSurface.WEB,
      path: "/support?ticket=ticket-1",
    });
    expect(resolve(NotificationType.SUPPORT_TICKET_RESOLVED, "ticket-2", {}, false)).toEqual({
      surface: NotificationSurface.WEB,
      path: "/support?ticket=ticket-2",
    });
  });

  it("returns null for a review request with no entityId", () => {
    expect(resolve(NotificationType.REVIEW_REQUESTED, null)).toBeNull();
  });
});
