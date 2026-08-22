import { describe, expect, it } from "vitest";

import { NotificationType } from "#generated/prisma/enums.js";

import type { NotificationActorSnapshot, NotificationRecord } from "./notification.types.js";
import { mergeRecentActors, removeRecentActor, toBroadcastPayload } from "./notification.utils.js";

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
