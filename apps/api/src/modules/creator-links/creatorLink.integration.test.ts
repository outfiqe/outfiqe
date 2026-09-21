import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  CreatorLinkStatus,
  CreatorLinkType,
  CreatorStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;
const OK_STATUS = 200;

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return `Bearer ${accessToken}`;
};

const createUser = (handle: string, overrides: { creatorStatus?: CreatorStatus } = {}) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name: handle,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: overrides.creatorStatus ?? CreatorStatus.APPROVED,
    },
  });

const createLink = (creatorId: string, type = CreatorLinkType.EXTERNAL_REUSABLE) =>
  prisma.creatorLink.create({
    data: { creatorId, type, token: randomUUID().replace(/-/g, "") },
  });

const deleteLink = (linkId: string, authHeader: string) =>
  request(testApp).delete(`/api/creator-links/${linkId}`).set("Authorization", authHeader);

describe("DELETE /api/creator-links/:id", () => {
  it("revokes the creator's own link, hides it from their list and stops it working", async () => {
    const creator = await createUser("link-owner");
    const link = await createLink(creator.id);

    const response = await deleteLink(link.id, authHeaderFor(creator.id));

    expect(response.status).toBe(OK_STATUS);
    const stored = await prisma.creatorLink.findUniqueOrThrow({ where: { id: link.id } });
    expect(stored.status).toBe(CreatorLinkStatus.REVOKED);

    const listResponse = await request(testApp)
      .get("/api/creator-links/mine")
      .set("Authorization", authHeaderFor(creator.id));
    const listedIds = listResponse.body.data.items.map((item: { id: string }) => item.id);
    expect(listedIds).not.toContain(link.id);

    const clickResponse = await request(testApp)
      .post(`/api/creator-links/${link.token}/click`)
      .send({ sessionId: randomUUID() });
    expect(clickResponse.status).toBe(NOT_FOUND_STATUS);
  });

  it("keeps the clicks already recorded on the deleted link", async () => {
    const creator = await createUser("link-history");
    const link = await createLink(creator.id);
    await prisma.creatorLinkClick.create({ data: { linkId: link.id, sessionId: randomUUID() } });

    await deleteLink(link.id, authHeaderFor(creator.id));

    const clickCount = await prisma.creatorLinkClick.count({ where: { linkId: link.id } });
    expect(clickCount).toBe(1);
  });

  it("can delete a single-use link that has already been used", async () => {
    const creator = await createUser("link-consumed");
    const link = await prisma.creatorLink.create({
      data: {
        creatorId: creator.id,
        type: CreatorLinkType.INTERNAL_SINGLE_USE,
        token: randomUUID().replace(/-/g, ""),
        status: CreatorLinkStatus.CONSUMED,
        consumedAt: new Date(),
      },
    });

    const response = await deleteLink(link.id, authHeaderFor(creator.id));

    expect(response.status).toBe(OK_STATUS);
    const stored = await prisma.creatorLink.findUniqueOrThrow({ where: { id: link.id } });
    expect(stored.status).toBe(CreatorLinkStatus.REVOKED);
  });

  it("is idempotent when the link is already deleted", async () => {
    const creator = await createUser("link-twice");
    const link = await createLink(creator.id);

    await deleteLink(link.id, authHeaderFor(creator.id));
    const secondResponse = await deleteLink(link.id, authHeaderFor(creator.id));

    expect(secondResponse.status).toBe(OK_STATUS);
  });

  it("answers 404 and leaves the link alone when it belongs to another creator", async () => {
    const owner = await createUser("real-owner");
    const otherCreator = await createUser("other-creator");
    const link = await createLink(owner.id);

    const response = await deleteLink(link.id, authHeaderFor(otherCreator.id));

    expect(response.status).toBe(NOT_FOUND_STATUS);
    const stored = await prisma.creatorLink.findUniqueOrThrow({ where: { id: link.id } });
    expect(stored.status).toBe(CreatorLinkStatus.ACTIVE);
  });

  it("answers 404 for a link that does not exist", async () => {
    const creator = await createUser("no-such-link");

    const response = await deleteLink(randomUUID(), authHeaderFor(creator.id));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });

  it("rejects a malformed link id", async () => {
    const creator = await createUser("bad-id");

    const response = await deleteLink("not-a-uuid", authHeaderFor(creator.id));

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it("rejects a creator who is not approved", async () => {
    const pendingCreator = await createUser("pending-creator", {
      creatorStatus: CreatorStatus.PENDING,
    });
    const link = await createLink(pendingCreator.id);

    const response = await deleteLink(link.id, authHeaderFor(pendingCreator.id));

    expect(response.status).toBe(FORBIDDEN_STATUS);
  });

  it("requires a signed-in user", async () => {
    const creator = await createUser("anonymous-target");
    const link = await createLink(creator.id);

    const response = await request(testApp).delete(`/api/creator-links/${link.id}`);

    expect(response.status).toBe(401);
  });

  it("lets the creator generate a fresh reusable link after deleting the old one", async () => {
    const creator = await createUser("regenerate");
    const oldLink = await createLink(creator.id);
    await deleteLink(oldLink.id, authHeaderFor(creator.id));

    const response = await request(testApp)
      .post("/api/creator-links/external")
      .set("Authorization", authHeaderFor(creator.id))
      .send({});

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.id).not.toBe(oldLink.id);
    expect(response.body.data.status).toBe(CreatorLinkStatus.ACTIVE);
  });
});
