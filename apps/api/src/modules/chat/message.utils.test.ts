import { describe, expect, it } from "vitest";

import { MessageKind } from "#generated/prisma/enums.js";

import { CHAT_SYSTEM_EVENT } from "./chat.constants.js";
import type { ConversationParticipantSummary } from "./conversation.types.js";
import {
  combineReaderCursors,
  conversationPreviewFor,
  describeSystemEvent,
  messagePreviewFor,
  parseSystemEvent,
  toMessageBroadcast,
  toMessageRecord,
  usersNotifiedBySystemEvent,
} from "./message.utils.js";

const SENDER: ConversationParticipantSummary = {
  id: "sender-1",
  name: "Ada",
  handle: "ada",
  avatarUrl: null,
};

const CREATED_AT = new Date("2026-01-01T12:00:00.000Z");

const ONE_SECOND_MS = 1000;

const baseRow = {
  id: "message-1",
  conversationId: "conversation-1",
  senderId: "sender-1",
  sender: SENDER,
  kind: MessageKind.USER,
  systemEvent: null,
  outfitId: null,
  body: "hello",
  attachments: [],
  createdAt: CREATED_AT,
};

const RAM = { id: "user-ram", name: "Ram" };
const SITA = { id: "user-sita", name: "Sita" };
const HARI = { id: "user-hari", name: "Hari" };

const addedEvent = {
  type: CHAT_SYSTEM_EVENT.MEMBERS_ADDED,
  members: [RAM, SITA, HARI],
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
      lastReadAt: new Date(CREATED_AT.getTime() + ONE_SECOND_MS),
      lastDeliveredAt: new Date(CREATED_AT.getTime() + ONE_SECOND_MS),
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

  it("carries a system event and never shows read ticks on it", () => {
    const record = toMessageRecord(
      { ...baseRow, kind: MessageKind.SYSTEM, body: null, systemEvent: addedEvent },
      "sender-1",
      { lastReadAt: CREATED_AT, lastDeliveredAt: CREATED_AT },
    );

    expect(record.kind).toBe(MessageKind.SYSTEM);
    expect(record.systemEvent).toEqual(addedEvent);
    expect(record.isReadByOthers).toBe(false);
    expect(record.isDeliveredToOthers).toBe(false);
  });

  it("ignores an event stored on a normal message", () => {
    expect(
      toMessageRecord({ ...baseRow, systemEvent: addedEvent }, "x", null).systemEvent,
    ).toBeNull();
  });
});

describe("conversationPreviewFor", () => {
  it("names the sender in a group and leaves a direct chat's preview alone", () => {
    expect(conversationPreviewFor("See you there", "Sita")).toBe("Sita: See you there");
    expect(conversationPreviewFor(null, "Sita")).toBe("Sita: Sent a photo");
    expect(conversationPreviewFor("See you there", null)).toBe("See you there");
  });
});

describe("combineReaderCursors", () => {
  it("has nothing to combine when nobody else is in the conversation", () => {
    expect(combineReaderCursors([])).toBeNull();
  });

  it("uses the reader who is furthest behind, so a tick means everyone has seen it", () => {
    const later = new Date(CREATED_AT.getTime() + ONE_SECOND_MS);

    expect(
      combineReaderCursors([
        { lastReadAt: later, lastDeliveredAt: later },
        { lastReadAt: CREATED_AT, lastDeliveredAt: later },
      ]),
    ).toEqual({ lastReadAt: CREATED_AT, lastDeliveredAt: later });
  });

  it("counts as unread while anyone hasn't read the conversation at all", () => {
    expect(
      combineReaderCursors([
        { lastReadAt: CREATED_AT, lastDeliveredAt: CREATED_AT },
        { lastReadAt: null, lastDeliveredAt: CREATED_AT },
      ]),
    ).toEqual({ lastReadAt: null, lastDeliveredAt: CREATED_AT });
  });
});

describe("describeSystemEvent", () => {
  it("writes each event as a plain sentence about who did what", () => {
    expect(
      describeSystemEvent({ type: CHAT_SYSTEM_EVENT.GROUP_CREATED, groupName: "Trip" }, "Ada"),
    ).toBe("Ada created the group");
    expect(
      describeSystemEvent({ type: CHAT_SYSTEM_EVENT.GROUP_RENAMED, groupName: "Trip" }, "Ada"),
    ).toBe('Ada renamed the group to "Trip"');
    expect(describeSystemEvent(addedEvent, "Ada")).toBe("Ada added Ram, Sita and Hari");
    expect(
      describeSystemEvent({ type: CHAT_SYSTEM_EVENT.MEMBERS_ADDED, members: [RAM] }, "Ada"),
    ).toBe("Ada added Ram");
    expect(
      describeSystemEvent({ type: CHAT_SYSTEM_EVENT.MEMBER_REMOVED, member: RAM }, "Ada"),
    ).toBe("Ada removed Ram");
    expect(describeSystemEvent({ type: CHAT_SYSTEM_EVENT.MEMBER_LEFT }, "Ada")).toBe("Ada left");
    expect(
      describeSystemEvent({ type: CHAT_SYSTEM_EVENT.ADMIN_ASSIGNED, member: RAM }, "Ada"),
    ).toBe("Ada made Ram an admin");
    expect(describeSystemEvent({ type: CHAT_SYSTEM_EVENT.ADMIN_REMOVED, member: RAM }, "Ada")).toBe(
      "Ada removed Ram as an admin",
    );
  });
});

describe("parseSystemEvent", () => {
  it("reads a valid stored event and drops anything it doesn't recognise", () => {
    expect(parseSystemEvent(addedEvent)).toEqual(addedEvent);
    expect(parseSystemEvent({ type: "SOMETHING_ELSE" })).toBeNull();
    expect(parseSystemEvent(null)).toBeNull();
  });
});

describe("usersNotifiedBySystemEvent", () => {
  it("notifies only the people who were just added", () => {
    expect(usersNotifiedBySystemEvent(addedEvent)).toEqual([RAM.id, SITA.id, HARI.id]);
    expect(usersNotifiedBySystemEvent({ type: CHAT_SYSTEM_EVENT.MEMBER_LEFT })).toEqual([]);
    expect(usersNotifiedBySystemEvent(null)).toEqual([]);
  });
});

describe("toMessageBroadcast", () => {
  it("flattens the sender and keeps the system event for live delivery", () => {
    const broadcast = toMessageBroadcast(
      { ...baseRow, kind: MessageKind.SYSTEM, body: null, systemEvent: addedEvent },
      ["user-ram"],
    );

    expect(broadcast).toMatchObject({
      senderName: SENDER.name,
      senderHandle: SENDER.handle,
      kind: MessageKind.SYSTEM,
      systemEvent: addedEvent,
      recipientIds: ["user-ram"],
      createdAt: CREATED_AT.toISOString(),
    });
  });
});
