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
  targetSurface: null,
  targetPath: null,
  organizationId: null,
  metadata: {},
  groupKey: null,
  actorCount: 1,
  isRead: false,
  readAt: null,
  createdAt: "2026-09-08T10:00:00.000Z",
  updatedAt: "2026-09-08T10:00:00.000Z",
  ...overrides,
});

describe("resolveNotificationMessage for outfit builds", () => {
  const sita = { id: "user-2", name: "Sita", handle: "sita", avatarUrl: null };

  it("names the build, or calls it an outfit build when it has no title", () => {
    expect(
      resolveNotificationMessage(
        buildNotification({
          type: "OUTFIT_INVITED",
          metadata: { actor: sita, outfitTitle: "Dashain look" },
        }),
      ),
    ).toBe('Sita invited you to build "Dashain look"');
    expect(
      resolveNotificationMessage(
        buildNotification({ type: "OUTFIT_SHARED", metadata: { actor: sita } }),
      ),
    ).toBe("Sita shared an outfit build with you");
  });

  it("groups board changes by the people who made them", () => {
    expect(
      resolveNotificationMessage(
        buildNotification({
          type: "OUTFIT_BOARD_ACTIVITY",
          actorCount: 2,
          metadata: {
            outfitTitle: "Dashain look",
            recentActors: [sita, { id: "user-3", name: "Ram", handle: "ram", avatarUrl: null }],
          },
        }),
      ),
    ).toBe('Sita and Ram changed "Dashain look"');
  });

  it("describes ready to lock, locked and public", () => {
    const withTitle = { outfitTitle: "Dashain look", actor: sita };
    expect(
      resolveNotificationMessage(
        buildNotification({ type: "OUTFIT_READY_TO_LOCK", metadata: withTitle }),
      ),
    ).toBe(`Everyone's happy with "Dashain look". It's ready to lock`);
    expect(
      resolveNotificationMessage(buildNotification({ type: "OUTFIT_LOCKED", metadata: withTitle })),
    ).toBe('Sita locked "Dashain look"');
    expect(
      resolveNotificationMessage(
        buildNotification({ type: "OUTFIT_MADE_PUBLIC", metadata: withTitle }),
      ),
    ).toBe('"Dashain look" is now public');
  });

  it("names the sold-out item, or counts them when several sold out together", () => {
    expect(
      resolveNotificationMessage(
        buildNotification({
          type: "OUTFIT_ITEMS_SOLD_OUT",
          metadata: {
            outfitTitle: "Dashain look",
            productName: "Maroon Kurta",
            soldOutItemCount: 1,
          },
        }),
      ),
    ).toBe('Maroon Kurta in "Dashain look" sold out. Swap to lock');
    expect(
      resolveNotificationMessage(
        buildNotification({
          type: "OUTFIT_ITEMS_SOLD_OUT",
          metadata: {
            outfitTitle: "Dashain look",
            productName: "Maroon Kurta",
            soldOutItemCount: 3,
          },
        }),
      ),
    ).toBe('3 items in "Dashain look" sold out. Swap to lock');
  });
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

  it("shows the admin-authored title for an announcement", () => {
    const message = resolveNotificationMessage(
      buildNotification({
        type: "ANNOUNCEMENT",
        metadata: { announcementTitle: "Livestream tomorrow" },
      }),
    );
    expect(message).toBe("Livestream tomorrow");
  });

  it("falls back to a generic label when an announcement has no title", () => {
    const message = resolveNotificationMessage(buildNotification({ type: "ANNOUNCEMENT" }));
    expect(message).toBe("New announcement");
  });

  it("names the ticket that has no one assigned", () => {
    expect(
      resolveNotificationMessage(
        buildNotification({
          type: "CRM_TICKET_UNASSIGNED",
          metadata: { crmItemTitle: "Wrong size sent" },
        }),
      ),
    ).toBe('New ticket with no one assigned: "Wrong size sent"');
    expect(resolveNotificationMessage(buildNotification({ type: "CRM_TICKET_UNASSIGNED" }))).toBe(
      "A new ticket has no one assigned",
    );
  });

  it("says who joined which team", () => {
    expect(
      resolveNotificationMessage(
        buildNotification({
          type: "CRM_MEMBER_JOINED",
          metadata: { crmMemberName: "Sita", crmOrganizationName: "Acme" },
        }),
      ),
    ).toBe("Sita joined Acme");
    expect(resolveNotificationMessage(buildNotification({ type: "CRM_MEMBER_JOINED" }))).toBe(
      "Someone joined your team",
    );
  });

  it("describes each billing problem", () => {
    expect(
      resolveNotificationMessage(
        buildNotification({ type: "CRM_INVOICE_DUE", metadata: { crmInvoiceAmount: 2700 } }),
      ),
    ).toBe("Your subscription renewal of Rs. 2700 is due");
    expect(resolveNotificationMessage(buildNotification({ type: "CRM_INVOICE_DUE" }))).toBe(
      "Your subscription renewal is due",
    );
    expect(
      resolveNotificationMessage(buildNotification({ type: "CRM_SUBSCRIPTION_PAST_DUE" })),
    ).toBe("Your subscription payment is overdue. Pay now to keep advanced features");
    expect(
      resolveNotificationMessage(buildNotification({ type: "CRM_SUBSCRIPTION_CANCELED" })),
    ).toBe("Your subscription was canceled because it wasn't renewed");
  });
});
