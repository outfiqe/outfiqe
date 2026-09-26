import { describe, expect, it } from "vitest";

import { NotificationType } from "#generated/prisma/enums.js";

import { MAX_RECENT_ACTORS } from "./notification.constants.js";
import type {
  NotificationActorSnapshot,
  NotificationMembershipGrant,
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

describe("canReceiveNotificationType", () => {
  it("lets everyone receive personal notifications", () => {
    expect(canReceiveNotificationType(NotificationType.LOOK_LIKED, [])).toBe(true);
    expect(canReceiveNotificationType(NotificationType.SUPPORT_TICKET_REPLY, [])).toBe(true);
  });

  it("keeps platform staff notifications from people outside the platform team", () => {
    expect(canReceiveNotificationType(NotificationType.BRAND_APPLICATION_SUBMITTED, [])).toBe(
      false,
    );
    expect(
      canReceiveNotificationType(NotificationType.BRAND_APPLICATION_SUBMITTED, [
        aGrant({ permissionKeys: ["platform:brands:manage"] }),
      ]),
    ).toBe(false);
  });

  it("gives a platform staff notification only to a role holding its permission", () => {
    const supportAgent = aGrant({
      isPlatformOrganization: true,
      permissionKeys: ["platform:support:respond"],
    });

    expect(
      canReceiveNotificationType(NotificationType.SUPPORT_TICKET_CREATED, [supportAgent]),
    ).toBe(true);
    expect(
      canReceiveNotificationType(NotificationType.BRAND_APPLICATION_SUBMITTED, [supportAgent]),
    ).toBe(false);
  });

  it("gives a co-founder every platform staff notification", () => {
    const coFounder = aGrant({ isPlatformOrganization: true, isOwner: true });

    expect(canReceiveNotificationType(NotificationType.COUPON_BUDGET_ALERT, [coFounder])).toBe(
      true,
    );
  });

  it("gives a tenant staff notification to a role holding its permission in any organization", () => {
    const billingManager = aGrant({ permissionKeys: ["billing:manage"] });

    expect(canReceiveNotificationType(NotificationType.CRM_INVOICE_DUE, [billingManager])).toBe(
      true,
    );
    expect(
      canReceiveNotificationType(NotificationType.CRM_TICKET_UNASSIGNED, [billingManager]),
    ).toBe(false);
  });

  it("gives a tenant owner every tenant staff notification", () => {
    expect(
      canReceiveNotificationType(NotificationType.CRM_MEMBER_JOINED, [aGrant({ isOwner: true })]),
    ).toBe(true);
  });

  it("gives assignment notifications to anyone with a CRM membership", () => {
    expect(canReceiveNotificationType(NotificationType.CRM_ITEM_ASSIGNED, [])).toBe(false);
    expect(canReceiveNotificationType(NotificationType.CRM_ITEM_ASSIGNED, [aGrant()])).toBe(true);
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
