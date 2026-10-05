import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { NotificationBroadcastPayload } from "#events/event-bus.types.js";
import {
  NotificationEntityType,
  NotificationSurface,
  NotificationType,
} from "#generated/prisma/enums.js";
import { ApprovedAccountKind } from "#modules/notifications/notification.constants.js";

import { toPushMessage } from "./push.messages.js";

const aNotification = (
  overrides: Partial<NotificationBroadcastPayload> = {},
): NotificationBroadcastPayload => ({
  id: randomUUID(),
  recipientId: randomUUID(),
  actorId: randomUUID(),
  type: NotificationType.LOOK_LIKED,
  entityType: NotificationEntityType.LOOK,
  entityId: randomUUID(),
  targetSurface: null,
  targetPath: null,
  organizationId: null,
  metadata: {},
  groupKey: null,
  actorCount: 1,
  isRead: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe("toPushMessage", () => {
  it("names the single person behind a cheriq", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.LOOK_LIKED, actorCount: 1 }),
    );

    expect(message.title).toBe("New cheriq");
    expect(message.body).toBe("Someone cheriqed your drop");
  });

  it("counts the group once more than one person did the same thing", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.NEW_FOLLOWER, actorCount: 4 }),
    );

    expect(message.body).toBe("4 people started following you");
  });

  it("names the brand and build on a new offer and links to the offers page", () => {
    const message = toPushMessage(
      aNotification({
        type: NotificationType.OUTFIT_OFFER_RECEIVED,
        entityType: NotificationEntityType.OUTFIT_OFFER,
        metadata: { brandName: "Kastha", outfitTitle: "Dashain set" },
      }),
    );

    expect(message.body).toBe('Kastha wants you to drop "Dashain set"');
    expect(message.url).toBe("/offers");
  });

  it("falls back to a plain brand name and sends released money to the wallet", () => {
    expect(
      toPushMessage(aNotification({ type: NotificationType.OUTFIT_OFFER_RECEIVED })).body,
    ).toBe("A brand wants you to drop an outfit build");
    expect(toPushMessage(aNotification({ type: NotificationType.OUTFIT_OFFER_RELEASED })).url).toBe(
      "/wallet",
    );
  });

  it("sends a follower notification to the follower's own profile", () => {
    const message = toPushMessage(aNotification({ type: NotificationType.NEW_FOLLOWER }));

    expect(message.url).toBe("/profile");
  });

  it("deep links an order status update to that order", () => {
    const orderId = randomUUID();
    const message = toPushMessage(
      aNotification({ type: NotificationType.ORDER_STATUS_CHANGED, entityId: orderId }),
    );

    expect(message.url).toBe(`/orders/${orderId}`);
  });

  it("falls back to the orders list when an order update has no entity id", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.ORDER_STATUS_CHANGED, entityId: null }),
    );

    expect(message.url).toBe("/orders");
  });

  it("sends a review request straight to the product's review form", () => {
    const productId = randomUUID();
    const message = toPushMessage(
      aNotification({ type: NotificationType.REVIEW_REQUESTED, entityId: productId }),
    );

    expect(message.url).toBe(`/product/${productId}?review=write#reviews`);
  });

  it("sends every withdrawal status to the wallet", () => {
    const approved = toPushMessage(
      aNotification({ type: NotificationType.WITHDRAW_REQUEST_APPROVED }),
    );
    const paid = toPushMessage(aNotification({ type: NotificationType.WITHDRAW_REQUEST_PAID }));

    expect(approved.url).toBe("/wallet");
    expect(paid.url).toBe("/wallet");
  });

  it("welcomes a newly approved muse and sends them to their dashboard", () => {
    const message = toPushMessage(
      aNotification({
        type: NotificationType.ACCOUNT_APPROVED,
        actorId: null,
        entityType: null,
        entityId: null,
        metadata: { approvedAccountKind: ApprovedAccountKind.CREATOR },
      }),
    );

    expect(message.title).toBe("Welcome to Outfiqe");
    expect(message.body).toBe("You're now an approved muse. Drop your first look");
    expect(message.url).toBe("/overview");
  });

  it("welcomes a new brand by name, or generically when the name is missing", () => {
    const named = toPushMessage(
      aNotification({
        type: NotificationType.ACCOUNT_APPROVED,
        metadata: { approvedAccountKind: ApprovedAccountKind.BRAND, brandName: "Meridian" },
      }),
    );
    const unnamed = toPushMessage(
      aNotification({
        type: NotificationType.ACCOUNT_APPROVED,
        metadata: { approvedAccountKind: ApprovedAccountKind.BRAND },
      }),
    );

    expect(named.body).toBe("Meridian is set up. Add your first products");
    expect(unnamed.body).toBe("Your brand is set up. Add your first products");
  });

  it("falls back to the notification list for a type with no dedicated page", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.BRAND_APPLICATION_SUBMITTED }),
    );

    expect(message.url).toBe("/notifications");
  });

  it("tags by group key first, so repeated likes on one look replace each other", () => {
    const message = toPushMessage(
      aNotification({
        type: NotificationType.LOOK_LIKED,
        groupKey: "look-liked:look-1",
        entityId: "look-1",
      }),
    );

    expect(message.tag).toBe("LOOK_LIKED:look-liked:look-1");
  });

  it("falls back to the entity id for a tag when there is no group", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.LOOK_COMMENTED, groupKey: null, entityId: "look-1" }),
    );

    expect(message.tag).toBe("LOOK_COMMENTED:look-1");
  });

  it("falls back to the notification's own id when there is neither a group nor an entity", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.LEVEL_UP, groupKey: null, entityId: null, id: "n-1" }),
    );

    expect(message.tag).toBe("LEVEL_UP:n-1");
  });

  it("uses the admin-authored title and body for an announcement", () => {
    const message = toPushMessage(
      aNotification({
        type: NotificationType.ANNOUNCEMENT,
        metadata: {
          announcementTitle: "Livestream tomorrow",
          announcementBody: "Join us at 6pm for a live drop.",
        },
      }),
    );

    expect(message.title).toBe("Livestream tomorrow");
    expect(message.body).toBe("Join us at 6pm for a live drop.");
  });

  it("falls back to generic copy when an announcement is missing its metadata", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.ANNOUNCEMENT, metadata: {} }),
    );

    expect(message.title).toBe("New announcement");
    expect(message.body).toBe("You have a new announcement");
  });

  it("opens an announcement's internal target path", () => {
    const message = toPushMessage(
      aNotification({
        type: NotificationType.ANNOUNCEMENT,
        targetSurface: null,
        targetPath: "/events/spring-drop",
      }),
    );

    expect(message.url).toBe("/events/spring-drop");
  });

  it("opens an announcement's external link even though targetSurface is null", () => {
    const message = toPushMessage(
      aNotification({
        type: NotificationType.ANNOUNCEMENT,
        targetSurface: null,
        targetPath: "https://forms.gle/survey",
      }),
    );

    expect(message.url).toBe("https://forms.gle/survey");
  });

  it("falls back to the notification list for an announcement with no call-to-action", () => {
    const message = toPushMessage(
      aNotification({ type: NotificationType.ANNOUNCEMENT, targetSurface: null, targetPath: null }),
    );

    expect(message.url).toBe("/notifications");
  });

  it("opens a tenant notification on that tenant's own admin address", () => {
    const message = toPushMessage(
      aNotification({
        type: NotificationType.CRM_SUBSCRIPTION_PAST_DUE,
        targetSurface: NotificationSurface.ADMIN,
        targetPath: "https://acme.outfiqe.com/admin/crm/billing",
        metadata: { crmOrganizationName: "Acme" },
      }),
    );

    expect(message.url).toBe("https://acme.outfiqe.com/admin/crm/billing");
    expect(message.body).toBe("The Acme subscription payment is overdue");
  });

  it("gives every notification type a title and a body", () => {
    for (const type of Object.values(NotificationType)) {
      const message = toPushMessage(aNotification({ type }));

      expect(message.title.length).toBeGreaterThan(0);
      expect(message.body.length).toBeGreaterThan(0);
    }
  });
});
