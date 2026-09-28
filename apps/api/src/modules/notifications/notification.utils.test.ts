import { describe, expect, it } from "vitest";

import { NotificationType } from "#generated/prisma/enums.js";

import { MAX_RECENT_ACTORS } from "./notification.constants.js";
import type {
  NotificationActorSnapshot,
  NotificationMembershipGrant,
  NotificationRecipientAudience,
  NotificationRecord,
} from "./notification.types.js";
import {
  buildNotificationDedupeKey,
  canReceiveNotificationType,
  mergeRecentActors,
  removeRecentActor,
  toBroadcastPayload,
  toNotificationRecord,
} from "./notification.utils.js";

const actor = (id: string): NotificationActorSnapshot => ({
  id,
  name: `Actor ${id}`,
  handle: `actor-${id}`,
  avatarUrl: null,
  isCreator: false,
  brandId: null,
});

describe("mergeRecentActors", () => {
  it("prepends the new actor as most-recent-first", () => {
    const merged = mergeRecentActors([actor("b"), actor("c")], actor("a"), 3);
    expect(merged.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("dedupes an actor already present instead of listing them twice", () => {
    const merged = mergeRecentActors([actor("a"), actor("b")], actor("a"), 3);
    expect(merged.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("caps the list at the given size", () => {
    const merged = mergeRecentActors([actor("b"), actor("c"), actor("d")], actor("a"), 3);
    expect(merged).toHaveLength(3);
    expect(merged.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("falls back to MAX_RECENT_ACTORS when no cap is passed", () => {
    const crowd = Array.from({ length: MAX_RECENT_ACTORS + 3 }, (_, index) => actor(`x${index}`));
    const merged = mergeRecentActors(crowd, actor("a"));
    expect(merged).toHaveLength(MAX_RECENT_ACTORS);
    expect(merged[0]?.id).toBe("a");
  });
});

describe("removeRecentActor", () => {
  it("removes only the matching actor", () => {
    const remaining = removeRecentActor([actor("a"), actor("b"), actor("c")], "b");
    expect(remaining.map((entry) => entry.id)).toEqual(["a", "c"]);
  });

  it("is a no-op when the actor isn't present", () => {
    const remaining = removeRecentActor([actor("a")], "z");
    expect(remaining.map((entry) => entry.id)).toEqual(["a"]);
  });
});

describe("toNotificationRecord", () => {
  const prismaRow = {
    id: "n1",
    recipientId: "r1",
    actorId: "a1",
    type: NotificationType.LOOK_LIKED,
    entityType: null,
    entityId: null,
    targetSurface: null,
    targetPath: null,
    organizationId: null,
    metadata: null,
    groupKey: null,
    actorCount: 1,
    isRead: false,
    readAt: null,
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-02T00:00:00.000Z"),
  };

  it("defaults a null metadata column to an empty object", () => {
    expect(toNotificationRecord(prismaRow).metadata).toEqual({});
  });

  it("passes a populated metadata column through untouched", () => {
    const record = toNotificationRecord({ ...prismaRow, metadata: { lookCaption: "hi" } });
    expect(record.metadata).toEqual({ lookCaption: "hi" });
    expect(record.id).toBe("n1");
  });
});

describe("toBroadcastPayload", () => {
  it("maps a notification record to its socket-safe, ISO-dated shape", () => {
    const record: NotificationRecord = {
      id: "n1",
      recipientId: "r1",
      actorId: "a1",
      type: NotificationType.LOOK_LIKED,
      entityType: null,
      entityId: null,
      targetSurface: null,
      targetPath: null,
      organizationId: null,
      metadata: { lookCaption: null },
      groupKey: "look-liked:l1",
      actorCount: 2,
      isRead: false,
      readAt: null,
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-02T00:00:00.000Z"),
    };

    const payload = toBroadcastPayload(record);

    expect(payload).toMatchObject({
      id: "n1",
      recipientId: "r1",
      actorCount: 2,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-02T00:00:00.000Z",
    });
  });
});

const aGrant = (
  overrides: Partial<NotificationMembershipGrant> = {},
): NotificationMembershipGrant => ({
  isPlatformOrganization: false,
  isOwner: false,
  permissionKeys: [],
  ...overrides,
});

const anAudience = (
  overrides: Partial<NotificationRecipientAudience> = {},
): NotificationRecipientAudience => ({
  isStaffAccount: false,
  isShopperAccount: false,
  isApprovedCreator: false,
  isBrandMember: false,
  membershipGrants: [],
  ...overrides,
});

const shopper = anAudience({ isShopperAccount: true });
const creator = anAudience({ isShopperAccount: true, isApprovedCreator: true });
const business = anAudience({ isBrandMember: true });
const staffWith = (...membershipGrants: NotificationMembershipGrant[]) =>
  anAudience({ isStaffAccount: true, membershipGrants });

const receivableTypesFor = (audience: NotificationRecipientAudience): NotificationType[] =>
  Object.values(NotificationType).filter((type) => canReceiveNotificationType(type, audience));

describe("canReceiveNotificationType", () => {
  it("gives a shopper their orders, replies, badges, support and messages, nothing creator or business", () => {
    const types = receivableTypesFor(shopper);

    expect(types).toContain(NotificationType.ORDER_STATUS_CHANGED);
    expect(types).toContain(NotificationType.REVIEW_REQUESTED);
    expect(types).toContain(NotificationType.COMMENT_REPLIED);
    expect(types).toContain(NotificationType.SUPPORT_TICKET_RESOLVED);
    expect(types).not.toContain(NotificationType.COMMISSION_EARNED);
    expect(types).not.toContain(NotificationType.LOOK_LIKED);
    expect(types).not.toContain(NotificationType.NEW_ORDER);
    expect(types).not.toContain(NotificationType.WITHDRAW_REQUEST_PAID);
  });

  it("adds looks, followers, commissions, tag results and withdrawals for an approved creator", () => {
    const types = receivableTypesFor(creator);

    for (const creatorType of [
      NotificationType.LOOK_LIKED,
      NotificationType.NEW_FOLLOWER,
      NotificationType.COMMISSION_EARNED,
      NotificationType.PRODUCT_TAG_APPROVED,
      NotificationType.WITHDRAW_REQUEST_PAID,
      NotificationType.ORDER_STATUS_CHANGED,
    ]) {
      expect(types).toContain(creatorType);
    }
    expect(types).not.toContain(NotificationType.NEW_ORDER);
  });

  it("gives a business its orders, followers, reviews, tag reviews and withdrawals, not shopper or creator types", () => {
    const types = receivableTypesFor(business);

    for (const businessType of [
      NotificationType.NEW_ORDER,
      NotificationType.NEW_BRAND_FOLLOWER,
      NotificationType.PRODUCT_REVIEWED,
      NotificationType.PRODUCT_TAG_SUBMITTED,
      NotificationType.PRODUCT_TAG_REVIEW_REMINDER,
      NotificationType.WITHDRAW_REQUEST_PAID,
    ]) {
      expect(types).toContain(businessType);
    }
    expect(types).not.toContain(NotificationType.ORDER_STATUS_CHANGED);
    expect(types).not.toContain(NotificationType.COMMISSION_EARNED);
    expect(types).not.toContain(NotificationType.LOOK_LIKED);
  });

  it("gives a support-only staff member support, messages and announcements, and no storefront activity", () => {
    const supportAgent = staffWith(
      aGrant({ isPlatformOrganization: true, permissionKeys: ["platform:support:respond"] }),
    );

    expect(receivableTypesFor(supportAgent).sort()).toEqual(
      [
        NotificationType.NEW_MESSAGE,
        NotificationType.SUPPORT_TICKET_CREATED,
        NotificationType.SUPPORT_TICKET_ASSIGNED,
        NotificationType.SUPPORT_TICKET_REPLY,
        NotificationType.ANNOUNCEMENT,
      ].sort(),
    );
  });

  it("keeps platform staff notifications to the platform team, even for the same permission elsewhere", () => {
    expect(
      canReceiveNotificationType(
        NotificationType.BRAND_APPLICATION_SUBMITTED,
        staffWith(aGrant({ permissionKeys: ["platform:brands:manage"] })),
      ),
    ).toBe(false);
  });

  it("gives a co-founder every platform staff notification", () => {
    const coFounder = staffWith(aGrant({ isPlatformOrganization: true, isOwner: true }));

    expect(canReceiveNotificationType(NotificationType.COUPON_BUDGET_ALERT, coFounder)).toBe(true);
    expect(canReceiveNotificationType(NotificationType.LOOK_LIKED, coFounder)).toBe(false);
  });

  it("gives tenant staff only the tenant notifications their role holds", () => {
    const billingManager = staffWith(aGrant({ permissionKeys: ["billing:manage"] }));

    expect(canReceiveNotificationType(NotificationType.CRM_INVOICE_DUE, billingManager)).toBe(true);
    expect(canReceiveNotificationType(NotificationType.CRM_TICKET_UNASSIGNED, billingManager)).toBe(
      false,
    );
    expect(canReceiveNotificationType(NotificationType.CRM_ITEM_ASSIGNED, billingManager)).toBe(
      false,
    );
  });

  it("gives assignment notifications only to people who can see CRM tasks or tickets", () => {
    expect(
      canReceiveNotificationType(
        NotificationType.CRM_ITEM_ASSIGNED,
        staffWith(aGrant({ permissionKeys: ["tickets:read"] })),
      ),
    ).toBe(true);
  });

  it("gives a business that also runs a tenant both business and tenant notifications", () => {
    const businessOwner = anAudience({
      isBrandMember: true,
      membershipGrants: [aGrant({ isOwner: true })],
    });

    expect(canReceiveNotificationType(NotificationType.NEW_ORDER, businessOwner)).toBe(true);
    expect(canReceiveNotificationType(NotificationType.CRM_MEMBER_JOINED, businessOwner)).toBe(
      true,
    );
  });
});

describe("buildNotificationDedupeKey", () => {
  it("keeps notifications of different types or entities from the same event apart", () => {
    const eventId = "order.status.changed:1-0";

    expect(
      buildNotificationDedupeKey(eventId, NotificationType.REVIEW_REQUESTED, "product-1"),
    ).not.toBe(buildNotificationDedupeKey(eventId, NotificationType.REVIEW_REQUESTED, "product-2"));
    expect(
      buildNotificationDedupeKey(eventId, NotificationType.ORDER_STATUS_CHANGED, null),
    ).not.toBe(buildNotificationDedupeKey(eventId, NotificationType.REVIEW_REQUESTED, null));
  });
});
