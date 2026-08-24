import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";

import { chatService } from "./chat.service.js";

beforeEach(async () => {
  await redis.flushdb();
});

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

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

describe("GET/PATCH /api/chat/settings", () => {
  it("defaults to chat enabled for a user who never touched their settings", async () => {
    const user = await createUser("Settings Default", "settings-default");

    const response = await request(testApp)
      .get("/api/chat/settings")
      .set("Authorization", authHeaderFor(user.id, user.role));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ isChatEnabled: true });
  });

  it("persists a global chat toggle and reflects it back", async () => {
    const user = await createUser("Settings Toggle", "settings-toggle");
    const authorization = authHeaderFor(user.id, user.role);

    const patchResponse = await request(testApp)
      .patch("/api/chat/settings")
      .set("Authorization", authorization)
      .send({ isChatEnabled: false });
    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.data).toEqual({ isChatEnabled: false });

    const getResponse = await request(testApp)
      .get("/api/chat/settings")
      .set("Authorization", authorization);
    expect(getResponse.body.data).toEqual({ isChatEnabled: false });
  });

  it("never lets an Admin turn their own chat off, and always reports it as on", async () => {
    const admin = await createUser("Support Admin", "support-admin", UserRole.ADMIN);
    const authorization = authHeaderFor(admin.id, admin.role);

    const patchResponse = await request(testApp)
      .patch("/api/chat/settings")
      .set("Authorization", authorization)
      .send({ isChatEnabled: false });
    expect(patchResponse.status).toBe(403);
    expect(patchResponse.body.code).toBe("ADMIN_CHAT_ALWAYS_ON");

    const getResponse = await request(testApp)
      .get("/api/chat/settings")
      .set("Authorization", authorization);
    expect(getResponse.body.data).toEqual({ isChatEnabled: true });
  });
});

describe("POST/DELETE /api/chat/blocks/:userId", () => {
  it("turns chat off with a specific person and lists them as blocked", async () => {
    const blocker = await createUser("Block Initiator", "block-initiator");
    const blocked = await createUser("Block Target", "block-target");

    const blockResponse = await request(testApp)
      .post(`/api/chat/blocks/${blocked.id}`)
      .set("Authorization", authHeaderFor(blocker.id, blocker.role));
    expect(blockResponse.status).toBe(200);

    const listResponse = await request(testApp)
      .get("/api/chat/blocks")
      .set("Authorization", authHeaderFor(blocker.id, blocker.role));
    expect(listResponse.body.data.items).toHaveLength(1);
    expect(listResponse.body.data.items[0].id).toBe(blocked.id);

    expect(await chatService.isChatAvailableBetween(blocker.id, blocked.id)).toBe(false);
  });

  it("is idempotent when the pair is already blocked in either direction", async () => {
    const blocker = await createUser("Idempotent Blocker", "idempotent-blocker");
    const blocked = await createUser("Idempotent Blocked", "idempotent-blocked");

    await request(testApp)
      .post(`/api/chat/blocks/${blocked.id}`)
      .set("Authorization", authHeaderFor(blocker.id, blocker.role));

    const secondAttempt = await request(testApp)
      .post(`/api/chat/blocks/${blocked.id}`)
      .set("Authorization", authHeaderFor(blocker.id, blocker.role));
    expect(secondAttempt.status).toBe(200);

    const reverseAttempt = await request(testApp)
      .post(`/api/chat/blocks/${blocker.id}`)
      .set("Authorization", authHeaderFor(blocked.id, blocked.role));
    expect(reverseAttempt.status).toBe(200);

    expect(await prisma.chatBlock.count()).toBe(1);
  });

  it("rejects blocking yourself", async () => {
    const user = await createUser("Self Blocker", "self-blocker");

    const response = await request(testApp)
      .post(`/api/chat/blocks/${user.id}`)
      .set("Authorization", authHeaderFor(user.id, user.role));
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("CANNOT_BLOCK_SELF");
  });

  it("rejects blocking an Admin account", async () => {
    const user = await createUser("Blocks Admin", "blocks-admin");
    const admin = await createUser("Unblockable Admin", "unblockable-admin", UserRole.ADMIN);

    const response = await request(testApp)
      .post(`/api/chat/blocks/${admin.id}`)
      .set("Authorization", authHeaderFor(user.id, user.role));
    expect(response.status).toBe(400);
    expect(response.body.code).toBe("CANNOT_BLOCK_ADMIN");
  });

  it("only lets the party who initiated a block remove it", async () => {
    const blocker = await createUser("Ownership Blocker", "ownership-blocker");
    const blocked = await createUser("Ownership Blocked", "ownership-blocked");

    await request(testApp)
      .post(`/api/chat/blocks/${blocked.id}`)
      .set("Authorization", authHeaderFor(blocker.id, blocker.role));

    const unauthorizedUnblock = await request(testApp)
      .delete(`/api/chat/blocks/${blocker.id}`)
      .set("Authorization", authHeaderFor(blocked.id, blocked.role));
    expect(unauthorizedUnblock.status).toBe(200);
    expect(await chatService.isChatAvailableBetween(blocker.id, blocked.id)).toBe(false);

    const authorizedUnblock = await request(testApp)
      .delete(`/api/chat/blocks/${blocked.id}`)
      .set("Authorization", authHeaderFor(blocker.id, blocker.role));
    expect(authorizedUnblock.status).toBe(200);
    expect(await chatService.isChatAvailableBetween(blocker.id, blocked.id)).toBe(true);
  });
});

describe("GET /api/chat/blocks/search", () => {
  it("excludes the caller and Admin accounts from results", async () => {
    const caller = await createUser("Searching Caller", "searching-caller-nova");
    await createUser("Searching Nova Admin", "searching-nova-admin", UserRole.ADMIN);
    const match = await createUser("Searching Nova Match", "searching-nova-match");

    const response = await request(testApp)
      .get("/api/chat/blocks/search")
      .query({ q: "Searching Nova" })
      .set("Authorization", authHeaderFor(caller.id, caller.role));

    const resultIds = response.body.data.contacts.map((contact: { id: string }) => contact.id);
    expect(resultIds).toContain(match.id);
    expect(resultIds).not.toContain(caller.id);
  });
});

describe("chatService.isChatAvailableBetween", () => {
  it("is false when either side has chat turned off globally", async () => {
    const userA = await createUser("Availability A", "availability-a");
    const userB = await createUser("Availability B", "availability-b");

    await chatService.setGlobalChatEnabled(userB.id, userB.role, false);

    expect(await chatService.isChatAvailableBetween(userA.id, userB.id)).toBe(false);
  });

  it("is true with an Admin regardless of settings or blocks", async () => {
    const user = await createUser("Availability User", "availability-user");
    const admin = await createUser("Availability Admin", "availability-admin", UserRole.ADMIN);

    await chatService.setGlobalChatEnabled(user.id, user.role, false);

    expect(await chatService.isChatAvailableBetween(user.id, admin.id)).toBe(true);
  });
});
