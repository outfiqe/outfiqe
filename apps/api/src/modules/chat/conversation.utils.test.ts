import { describe, expect, it } from "vitest";

import type {
  ConversationParticipantPresence,
  ConversationParticipantSummary,
} from "./conversation.types.js";
import { buildDirectKey, toConversationPreview } from "./conversation.utils.js";

const otherUser: ConversationParticipantSummary = {
  id: "user-2",
  name: "Bea",
  handle: "bea",
  avatarUrl: null,
};

const baseConversation = {
  id: "conversation-1",
  type: "DIRECT" as const,
  lastMessagePreview: "hey",
  lastMessageAt: new Date("2026-01-01T12:00:00.000Z"),
  updatedAt: new Date("2026-01-01T12:00:00.000Z"),
  participants: [
    { userId: "user-1", unreadCount: 2, user: otherUser },
    { userId: "user-2", unreadCount: 0, user: otherUser },
  ],
};

describe("buildDirectKey", () => {
  it("produces the same key regardless of argument order", () => {
    expect(buildDirectKey("user-1", "user-2")).toBe(buildDirectKey("user-2", "user-1"));
  });

  it("joins the sorted ids with a colon", () => {
    expect(buildDirectKey("user-2", "user-1")).toBe("user-1:user-2");
  });
});

describe("toConversationPreview", () => {
  it("attaches the other participant's live presence when known", () => {
    const presence = new Map<string, ConversationParticipantPresence>([
      ["user-2", { isOnline: true, lastSeenAt: "2026-01-01T11:00:00.000Z" }],
    ]);

    const preview = toConversationPreview(baseConversation, "user-1", presence);

    expect(preview.otherParticipant).toEqual({
      ...otherUser,
      isOnline: true,
      lastSeenAt: "2026-01-01T11:00:00.000Z",
    });
    expect(preview.unreadCount).toBe(2);
    expect(preview.lastMessageAt).toBe("2026-01-01T12:00:00.000Z");
  });

  it("defaults to offline with no last-seen when presence is unknown", () => {
    const preview = toConversationPreview(baseConversation, "user-1", new Map());

    expect(preview.otherParticipant).toEqual({
      ...otherUser,
      isOnline: false,
      lastSeenAt: null,
    });
  });

  it("has no other participant when the caller is the only one left", () => {
    const soloConversation = {
      ...baseConversation,
      participants: [{ userId: "user-1", unreadCount: 0, user: otherUser }],
    };

    const preview = toConversationPreview(soloConversation, "user-1", new Map());

    expect(preview.otherParticipant).toBeNull();
  });

  it("defaults unread count to zero when the caller isn't a listed participant", () => {
    const preview = toConversationPreview(baseConversation, "user-3", new Map());

    expect(preview.unreadCount).toBe(0);
  });

  it("passes through a null last-message timestamp", () => {
    const preview = toConversationPreview(
      { ...baseConversation, lastMessageAt: null },
      "user-1",
      new Map(),
    );

    expect(preview.lastMessageAt).toBeNull();
  });
});
