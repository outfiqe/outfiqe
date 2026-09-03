import { describe, expect, it } from "vitest";

import { NotificationType } from "#generated/prisma/enums.js";

import { MAX_RECENT_ACTORS } from "./notification.constants.js";
import type { NotificationActorSnapshot, NotificationRecord } from "./notification.types.js";
import {
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
