import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Prisma } from "#generated/prisma/client.js";
import type { OutboxJobData } from "#outbox/outbox.types.js";

const mocks = vi.hoisted(() => ({
  publish: vi.fn(),
  findById: vi.fn(),
  toMessageBroadcast: vi.fn(),
}));

vi.mock("#events/event-bus.js", () => ({
  DomainEvents: {
    MESSAGE_CREATED: "message.created",
    CONVERSATION_MEMBER_REMOVED: "conversation.member-removed",
  },
  eventBus: { publish: mocks.publish },
}));
vi.mock("./message.repository.js", () => ({
  messageRepository: { findById: mocks.findById },
}));
vi.mock("./message.utils.js", () => ({ toMessageBroadcast: mocks.toMessageBroadcast }));

const { announceChatMemberRemoved, announceChatMessageCreated } = await import("./chat.outbox.js");

const MESSAGE_ID = "5f1f8f5e-3b1c-4b8e-9f4a-2c1d3e4f5a6b";
const CONVERSATION_ID = "0b6c9a2e-7d4f-4e1a-8b3c-9d8e7f6a5b4c";
const RECIPIENT_ID = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";

const jobWith = (payload: Prisma.JsonValue): OutboxJobData => ({
  outboxEventId: "event-1",
  aggregateId: CONVERSATION_ID,
  payload,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("announceChatMessageCreated", () => {
  it("loads the message and publishes it to its recipients", async () => {
    const message = { id: MESSAGE_ID };
    const broadcast = { id: MESSAGE_ID, recipientIds: [RECIPIENT_ID] };
    mocks.findById.mockResolvedValue(message);
    mocks.toMessageBroadcast.mockReturnValue(broadcast);

    await announceChatMessageCreated(
      jobWith({ messageId: MESSAGE_ID, recipientIds: [RECIPIENT_ID] }),
    );

    expect(mocks.toMessageBroadcast).toHaveBeenCalledWith(message, [RECIPIENT_ID]);
    expect(mocks.publish).toHaveBeenCalledWith("message.created", broadcast);
  });

  it("does nothing for a message that no longer exists or an unreadable payload", async () => {
    mocks.findById.mockResolvedValue(null);
    await announceChatMessageCreated(jobWith({ messageId: MESSAGE_ID, recipientIds: [] }));
    await announceChatMessageCreated(jobWith({ messageId: "not-a-uuid" }));

    expect(mocks.publish).not.toHaveBeenCalled();
  });
});

describe("announceChatMemberRemoved", () => {
  it("publishes the removal so the person's sockets leave the chat", async () => {
    await announceChatMemberRemoved(
      jobWith({ conversationId: CONVERSATION_ID, userId: RECIPIENT_ID }),
    );

    expect(mocks.publish).toHaveBeenCalledWith("conversation.member-removed", {
      conversationId: CONVERSATION_ID,
      userId: RECIPIENT_ID,
    });
  });

  it("skips an unreadable payload", async () => {
    await announceChatMemberRemoved(jobWith({ conversationId: CONVERSATION_ID }));

    expect(mocks.publish).not.toHaveBeenCalled();
  });
});
