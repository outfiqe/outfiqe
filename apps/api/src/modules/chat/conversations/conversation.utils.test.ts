import { describe, expect, it } from "vitest";

import { ConversationMemberRole, ConversationType } from "#generated/prisma/enums.js";

import type {
  ConversationParticipantPresence,
  ConversationParticipantSummary,
} from "./conversation.types.js";
import {
  buildDirectKey,
  otherParticipantIdOf,
  toConversationPreview,
} from "./conversation.utils.js";

const otherUser: ConversationParticipantSummary = {
  id: "user-2",
  name: "Bea",
  handle: "bea",
  avatarUrl: null,
};

const JOINED_AT = new Date("2026-01-01T10:00:00.000Z");

const participantRow = (
  userId: string,
  user: ConversationParticipantSummary,
  overrides: Partial<{ unreadCount: number; role: ConversationMemberRole; joinedAt: Date }> = {},
) => ({
  userId,
  user,
  unreadCount: 0,
  role: ConversationMemberRole.MEMBER,
  joinedAt: JOINED_AT,
  ...overrides,
});

const baseConversation = {
  id: "conversation-1",
  type: ConversationType.DIRECT,
  name: null,
  lastMessagePreview: "hey",
  lastMessageAt: new Date("2026-01-01T12:00:00.000Z"),
  updatedAt: new Date("2026-01-01T12:00:00.000Z"),
  participants: [
    participantRow("user-1", otherUser, { unreadCount: 2 }),
    participantRow("user-2", otherUser),
  ],
};

const memberSummary = (id: string): ConversationParticipantSummary => ({
  id,
  name: `Member ${id}`,
  handle: id,
  avatarUrl: null,
});

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
      participants: [participantRow("user-1", otherUser)],
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

  it("has no group summary for a direct conversation", () => {
    expect(toConversationPreview(baseConversation, "user-1", new Map()).group).toBeNull();
  });

  it("describes a group by name, size, earliest members and the caller's own role", () => {
    const joinedAtOffsetMs = 1000;
    const groupMembers = ["u1", "u2", "u3", "u4", "u5"].map((id, index) =>
      participantRow(id, memberSummary(id), {
        joinedAt: new Date(JOINED_AT.getTime() + index * joinedAtOffsetMs),
        role: id === "u1" ? ConversationMemberRole.ADMIN : ConversationMemberRole.MEMBER,
        unreadCount: id === "u3" ? 4 : 0,
      }),
    );
    const groupConversation = {
      ...baseConversation,
      type: ConversationType.GROUP,
      name: "Wedding looks",
      participants: [...groupMembers].reverse(),
    };

    const preview = toConversationPreview(groupConversation, "u3", new Map());

    expect(preview.otherParticipant).toBeNull();
    expect(preview.unreadCount).toBe(4);
    expect(preview.group).toEqual({
      name: "Wedding looks",
      memberCount: 5,
      members: ["u1", "u2", "u3", "u4"].map(memberSummary),
      myRole: ConversationMemberRole.MEMBER,
    });
  });
});

describe("otherParticipantIdOf", () => {
  it("finds the other person in a direct chat and nobody in a group", () => {
    expect(otherParticipantIdOf(baseConversation, "user-1")).toBe("user-2");
    expect(
      otherParticipantIdOf({ ...baseConversation, type: ConversationType.GROUP }, "user-1"),
    ).toBeNull();
  });
});
