import type { Notification } from "@outfiqe/types";
import { describe, expect, it } from "vitest";

import { resolveNotificationHref } from "./resolveNotificationHref";

const buildNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: "notif-1",
  recipientId: "admin-1",
  actorId: null,
  type: "BRAND_APPLICATION_SUBMITTED",
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
  it("routes a new brand application to the applications page", () => {
    expect(
      resolveNotificationHref(buildNotification({ type: "BRAND_APPLICATION_SUBMITTED" })),
    ).toBe("/");
  });

  it("deep-links support ticket events to the ticket, falling back to the list", () => {
    const created = buildNotification({ type: "SUPPORT_TICKET_CREATED", entityId: "ticket-1" });
    expect(resolveNotificationHref(created)).toBe("/support/ticket-1");

    const assigned = buildNotification({ type: "SUPPORT_TICKET_ASSIGNED", entityId: null });
    expect(resolveNotificationHref(assigned)).toBe("/support");

    const replied = buildNotification({ type: "SUPPORT_TICKET_REPLY", entityId: "ticket-2" });
    expect(resolveNotificationHref(replied)).toBe("/support/ticket-2");
  });

  it("returns null for a resolved support ticket, since the admin already closed it", () => {
    expect(
      resolveNotificationHref(buildNotification({ type: "SUPPORT_TICKET_RESOLVED" })),
    ).toBeNull();
  });

  it("routes a CRM ticket assignment to the CRM support tab", () => {
    const notification = buildNotification({
      type: "CRM_ITEM_ASSIGNED",
      metadata: { crmItemKind: "ticket", crmItemTitle: "Billing question" },
    });
    expect(resolveNotificationHref(notification)).toBe("/crm/support");
  });

  it("routes a CRM task assignment to the CRM tasks tab", () => {
    const notification = buildNotification({
      type: "CRM_ITEM_ASSIGNED",
      metadata: { crmItemKind: "task", crmItemTitle: "Follow up with partner" },
    });
    expect(resolveNotificationHref(notification)).toBe("/crm/tasks");
  });

  it("returns null for customer/creator-facing types that never reach admin", () => {
    expect(resolveNotificationHref(buildNotification({ type: "LOOK_LIKED" }))).toBeNull();
    expect(resolveNotificationHref(buildNotification({ type: "NEW_FOLLOWER" }))).toBeNull();
    expect(resolveNotificationHref(buildNotification({ type: "COMMISSION_EARNED" }))).toBeNull();
    expect(resolveNotificationHref(buildNotification({ type: "NEW_ORDER" }))).toBeNull();
    expect(resolveNotificationHref(buildNotification({ type: "ORDER_STATUS_CHANGED" }))).toBeNull();
    expect(
      resolveNotificationHref(buildNotification({ type: "WITHDRAW_REQUEST_APPROVED" })),
    ).toBeNull();
    expect(resolveNotificationHref(buildNotification({ type: "NEW_MESSAGE" }))).toBeNull();
  });
});
