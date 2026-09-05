import { describe, expect, it } from "vitest";

import type { ConversationParticipantSummary } from "./conversation.types.js";
import { messagePreviewFor, toMessageRecord } from "./message.utils.js";

const SENDER: ConversationParticipantSummary = {
  id: "sender-1",
  name: "Ada",
  handle: "ada",
  avatarUrl: null,
};

const CREATED_AT = new Date("2026-01-01T12:00:00.000Z");

const baseRow = {
  id: "message-1",
  conversationId: "conversation-1",
  senderId: "sender-1",
  sender: SENDER,
  body: "hello",
  attachments: [],
  createdAt: CREATED_AT,
};

describe("messagePreviewFor", () => {
  it("returns the message body when there is one", () => {
    expect(messagePreviewFor("hey there")).toBe("hey there");
  });

  it("truncates a body longer than the preview length", () => {
    const longBody = "a".repeat(200);
    expect(messagePreviewFor(longBody)).toBe("a".repeat(140));
  });

  it("falls back to a photo caption when the body is null", () => {
    expect(messagePreviewFor(null)).toBe("Sent a photo");
  });
});

describe("toMessageRecord", () => {
  it("marks a message from someone else as not mine, undelivered, and unread", () => {
    const record = toMessageRecord({ ...baseRow, senderId: "other-user" }, "sender-1", {
      lastReadAt: new Date(CREATED_AT.getTime() + 1000),
      lastDeliveredAt: new Date(CREATED_AT.getTime() + 1000),
    });

    expect(record.isMine).toBe(false);
    expect(record.isDeliveredToOthers).toBe(false);
    expect(record.isReadByOthers).toBe(false);
  });

  it("treats a missing other-participant cursor as never delivered or read", () => {
    const record = toMessageRecord(baseRow, "sender-1", null);

    expect(record.isMine).toBe(true);
    expect(record.isDeliveredToOthers).toBe(false);
    expect(record.isReadByOthers).toBe(false);
  });

  it("is not delivered/read while the other participant's cursor is still behind the message", () => {
    const record = toMessageRecord(baseRow, "sender-1", {
      lastReadAt: new Date(CREATED_AT.getTime() - 1000),
      lastDeliveredAt: new Date(CREATED_AT.getTime() - 1000),
    });

    expect(record.isDeliveredToOthers).toBe(false);
    expect(record.isReadByOthers).toBe(false);
  });

  it("is delivered and read once the other participant's cursor catches up", () => {
    const record = toMessageRecord(baseRow, "sender-1", {
      lastReadAt: new Date(CREATED_AT.getTime() + 1000),
      lastDeliveredAt: CREATED_AT,
    });

    expect(record.isDeliveredToOthers).toBe(true);
    expect(record.isReadByOthers).toBe(true);
  });

  it("serializes createdAt to an ISO string and passes through attachments", () => {
    const attachment = {
      id: "attachment-1",
      url: "a.png",
      mimeType: "image/png",
      width: 10,
      height: 10,
    };
    const record = toMessageRecord({ ...baseRow, attachments: [attachment] }, "sender-1", null);

    expect(record.createdAt).toBe(CREATED_AT.toISOString());
    expect(record.attachments).toEqual([attachment]);
  });
});
