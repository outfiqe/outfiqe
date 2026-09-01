import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { MessageBroadcastPayload } from "#events/event-bus.types.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
  vi.restoreAllMocks();
});

const createUser = async (name: string, handle: string, role: UserRole = UserRole.CUSTOMER) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const startConversation = (callerId: string, callerRole: UserRole, targetUserId: string) =>
  request(testApp)
    .post("/api/conversations")
    .set("Authorization", authHeaderFor(callerId, callerRole))
    .send({ userId: targetUserId });

const sendMessage = (
  callerId: string,
  callerRole: UserRole,
  conversationId: string,
  payload: { body?: string; attachments?: unknown[] },
) =>
  request(testApp)
    .post(`/api/conversations/${conversationId}/messages`)
    .set("Authorization", authHeaderFor(callerId, callerRole))
    .send(payload);

describe("POST /api/conversations", () => {
  it("starts a direct conversation between two users", async () => {
    const userA = await createUser("Convo A", "convo-a");
    const userB = await createUser("Convo B", "convo-b");

    const response = await startConversation(userA.id, userA.role, userB.id);
    expect(response.status).toBe(200);
    expect(response.body.data.type).toBe("DIRECT");
    expect(response.body.data.otherParticipant.id).toBe(userB.id);
  });

  it("returns the same conversation on repeated start, from either side", async () => {
    const userA = await createUser("Idempotent A", "idempotent-a");
    const userB = await createUser("Idempotent B", "idempotent-b");

    const first = await startConversation(userA.id, userA.role, userB.id);
    const second = await startConversation(userA.id, userA.role, userB.id);
    const reverse = await startConversation(userB.id, userB.role, userA.id);

    expect(second.body.data.id).toBe(first.body.data.id);
    expect(reverse.body.data.id).toBe(first.body.data.id);
    expect(await prisma.conversation.count()).toBe(1);
  });

  it("rejects starting a conversation with yourself", async () => {
    const user = await createUser("Self Convo", "self-convo");

    const response = await startConversation(user.id, user.role, user.id);
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("CANNOT_MESSAGE_SELF");
  });

  it("rejects starting a conversation when the pair has chat unavailable", async () => {
    const userA = await createUser("Blocked Starter", "blocked-starter");
    const userB = await createUser("Blocked Target", "blocked-target");
    await prisma.chatBlock.create({ data: { blockerId: userB.id, blockedId: userA.id } });

    const response = await startConversation(userA.id, userA.role, userB.id);
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CHAT_UNAVAILABLE");
  });
});

describe("Sending and listing messages", () => {
  it("sends a text message and shows it in the other participant's conversation list", async () => {
    const userA = await createUser("Sender", "sender");
    const userB = await createUser("Recipient", "recipient");
    const { body: conversation } = await startConversation(userA.id, userA.role, userB.id);

    const sendResponse = await sendMessage(userA.id, userA.role, conversation.data.id, {
      body: "Hello there",
    });
    expect(sendResponse.status).toBe(200);
    expect(sendResponse.body.data.body).toBe("Hello there");
    expect(sendResponse.body.data.isMine).toBe(true);

    const listResponse = await request(testApp)
      .get("/api/conversations")
      .set("Authorization", authHeaderFor(userB.id, userB.role));
    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.items[0].lastMessagePreview).toBe("Hello there");
    expect(listResponse.body.data.items[0].unreadCount).toBe(1);
  });

  it("excludes conversations with no messages yet from the list", async () => {
    const userA = await createUser("Empty Starter", "empty-starter");
    const userB = await createUser("Empty Target", "empty-target");
    await startConversation(userA.id, userA.role, userB.id);

    const listResponse = await request(testApp)
      .get("/api/conversations")
      .set("Authorization", authHeaderFor(userA.id, userA.role));
    expect(listResponse.body.data.items).toHaveLength(0);
  });

  it("filters the conversation list by the other participant's name or handle", async () => {
    const searcher = await createUser("Search Caller", "search-caller");
    const jane = await createUser("Jane Match", "jane-handle");
    const bob = await createUser("Bob NoMatch", "bob-handle");
    await sendMessage(
      searcher.id,
      searcher.role,
      (await startConversation(searcher.id, searcher.role, jane.id)).body.data.id,
      { body: "hi jane" },
    );
    await sendMessage(
      searcher.id,
      searcher.role,
      (await startConversation(searcher.id, searcher.role, bob.id)).body.data.id,
      { body: "hi bob" },
    );

    const byName = await request(testApp)
      .get("/api/conversations")
      .query({ q: "Jane" })
      .set("Authorization", authHeaderFor(searcher.id, searcher.role));
    expect(byName.body.data.items).toHaveLength(1);
    expect(byName.body.data.items[0].otherParticipant.id).toBe(jane.id);

    const byHandle = await request(testApp)
      .get("/api/conversations")
      .query({ q: "jane-handle" })
      .set("Authorization", authHeaderFor(searcher.id, searcher.role));
    expect(byHandle.body.data.items).toHaveLength(1);
    expect(byHandle.body.data.items[0].otherParticipant.id).toBe(jane.id);
  });

  it("never lets a search term leak a conversation the caller isn't part of", async () => {
    const outsider = await createUser("Outsider", "outsider");
    const memberA = await createUser("Member A Match", "member-a-match");
    const memberB = await createUser("Member B", "member-b");
    await sendMessage(
      memberA.id,
      memberA.role,
      (await startConversation(memberA.id, memberA.role, memberB.id)).body.data.id,
      { body: "private chat" },
    );

    const response = await request(testApp)
      .get("/api/conversations")
      .query({ q: "Match" })
      .set("Authorization", authHeaderFor(outsider.id, outsider.role));
    expect(response.body.data.items).toHaveLength(0);
  });

  it("sends an image-only message with no body", async () => {
    const userA = await createUser("Photo Sender", "photo-sender");
    const userB = await createUser("Photo Recipient", "photo-recipient");
    const { body: conversation } = await startConversation(userA.id, userA.role, userB.id);

    const response = await sendMessage(userA.id, userA.role, conversation.data.id, {
      attachments: [{ url: "https://cdn.outfiqe.test/photo.jpg", mimeType: "image/jpeg" }],
    });
    expect(response.status).toBe(200);
    expect(response.body.data.body).toBeNull();
    expect(response.body.data.attachments).toHaveLength(1);
  });

  it("includes full attachment data in the real-time broadcast, not just a boolean flag", async () => {
    const userA = await createUser("Broadcast Sender", "broadcast-sender");
    const userB = await createUser("Broadcast Recipient", "broadcast-recipient");
    const { body: conversation } = await startConversation(userA.id, userA.role, userB.id);
    const publishSpy = vi.spyOn(eventBus, "publish");

    await sendMessage(userA.id, userA.role, conversation.data.id, {
      attachments: [{ url: "https://cdn.outfiqe.test/photo.jpg", mimeType: "image/jpeg" }],
    });

    const isMessageCreatedCall = (
      call: (typeof publishSpy.mock.calls)[number],
    ): call is [typeof DomainEvents.MESSAGE_CREATED, MessageBroadcastPayload] =>
      call[0] === DomainEvents.MESSAGE_CREATED;
    const messageCreatedCall = publishSpy.mock.calls.find(isMessageCreatedCall);

    expect(messageCreatedCall).toBeDefined();
    expect(messageCreatedCall?.[1].attachments).toEqual([
      expect.objectContaining({
        url: "https://cdn.outfiqe.test/photo.jpg",
        mimeType: "image/jpeg",
      }),
    ]);
  });

  it("rejects an empty message with no body and no attachments", async () => {
    const userA = await createUser("Empty Sender", "empty-sender");
    const userB = await createUser("Empty Recipient", "empty-recipient");
    const { body: conversation } = await startConversation(userA.id, userA.role, userB.id);

    const response = await sendMessage(userA.id, userA.role, conversation.data.id, {});
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("EMPTY_MESSAGE");
  });

  it("rejects sending from someone who isn't a participant", async () => {
    const userA = await createUser("Owner A", "owner-a");
    const userB = await createUser("Owner B", "owner-b");
    const outsider = await createUser("Outsider", "outsider");
    const { body: conversation } = await startConversation(userA.id, userA.role, userB.id);

    const response = await sendMessage(outsider.id, outsider.role, conversation.data.id, {
      body: "I shouldn't be able to send this",
    });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("NOT_A_PARTICIPANT");
  });

  it("rejects sending once the pair's chat becomes unavailable mid-conversation", async () => {
    const userA = await createUser("Mid Blocker", "mid-blocker");
    const userB = await createUser("Mid Blocked", "mid-blocked");
    const { body: conversation } = await startConversation(userA.id, userA.role, userB.id);
    await sendMessage(userA.id, userA.role, conversation.data.id, { body: "First message" });

    await prisma.chatBlock.create({ data: { blockerId: userB.id, blockedId: userA.id } });

    const response = await sendMessage(userA.id, userA.role, conversation.data.id, {
      body: "Can you still see this?",
    });
    expect(response.status).toBe(403);
    expect(response.body.code).toBe("CHAT_UNAVAILABLE");
  });
});

describe("PATCH /api/conversations/:id/read", () => {
  it("resets the caller's unread count and marks their messages read by the sender", async () => {
    const userA = await createUser("Read Sender", "read-sender");
    const userB = await createUser("Read Recipient", "read-recipient");
    const { body: conversation } = await startConversation(userA.id, userA.role, userB.id);
    await sendMessage(userA.id, userA.role, conversation.data.id, { body: "Are you there?" });

    const beforeRead = await request(testApp)
      .get(`/api/conversations/${conversation.data.id}/messages`)
      .set("Authorization", authHeaderFor(userA.id, userA.role));
    expect(beforeRead.body.data.items[0].isReadByOthers).toBe(false);

    const readResponse = await request(testApp)
      .patch(`/api/conversations/${conversation.data.id}/read`)
      .set("Authorization", authHeaderFor(userB.id, userB.role));
    expect(readResponse.status).toBe(200);

    const listResponse = await request(testApp)
      .get("/api/conversations")
      .set("Authorization", authHeaderFor(userB.id, userB.role));
    expect(listResponse.body.data.items[0].unreadCount).toBe(0);

    const afterRead = await request(testApp)
      .get(`/api/conversations/${conversation.data.id}/messages`)
      .set("Authorization", authHeaderFor(userA.id, userA.role));
    expect(afterRead.body.data.items[0].isReadByOthers).toBe(true);
  });
});

describe("Delivery status", () => {
  it("marks a message delivered once the recipient fetches the thread", async () => {
    const userA = await createUser("Delivery Sender", "delivery-sender");
    const userB = await createUser("Delivery Recipient", "delivery-recipient");
    const { body: conversation } = await startConversation(userA.id, userA.role, userB.id);
    await sendMessage(userA.id, userA.role, conversation.data.id, { body: "Delivered?" });

    const beforeFetch = await request(testApp)
      .get(`/api/conversations/${conversation.data.id}/messages`)
      .set("Authorization", authHeaderFor(userA.id, userA.role));
    expect(beforeFetch.body.data.items[0].isDeliveredToOthers).toBe(false);

    await request(testApp)
      .get(`/api/conversations/${conversation.data.id}/messages`)
      .set("Authorization", authHeaderFor(userB.id, userB.role));

    const afterFetch = await request(testApp)
      .get(`/api/conversations/${conversation.data.id}/messages`)
      .set("Authorization", authHeaderFor(userA.id, userA.role));
    expect(afterFetch.body.data.items[0].isDeliveredToOthers).toBe(true);
  });

  it("never marks a message delivered or read to the recipient's own eyes", async () => {
    const userA = await createUser("Own Eyes Sender", "own-eyes-sender");
    const userB = await createUser("Own Eyes Recipient", "own-eyes-recipient");
    const { body: conversation } = await startConversation(userA.id, userA.role, userB.id);
    await sendMessage(userA.id, userA.role, conversation.data.id, { body: "Hi" });

    const asRecipient = await request(testApp)
      .get(`/api/conversations/${conversation.data.id}/messages`)
      .set("Authorization", authHeaderFor(userB.id, userB.role));
    expect(asRecipient.body.data.items[0].isMine).toBe(false);
    expect(asRecipient.body.data.items[0].isDeliveredToOthers).toBe(false);
    expect(asRecipient.body.data.items[0].isReadByOthers).toBe(false);
  });
});
