import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { badgeRepository } from "#modules/badges/badge.repository.js";
import { testApp } from "#test/integration/testApp.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createUser = async (name: string) =>
  prisma.user.create({
    data: {
      email: `${name}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${name}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return `Bearer ${accessToken}`;
};

const createBadge = async (overrides: {
  isTitleEligible?: boolean;
  assignmentLimit?: number | null;
  xpReward?: number;
}) =>
  prisma.badge.create({
    data: {
      name: `Test Badge ${randomUUID()}`,
      description: "A badge created for integration testing.",
      category: "SPECIAL",
      rarity: "EXCLUSIVE",
      icon: "🏅",
      designConfig: { shape: "hexagon", primaryColor: "#000000" },
      xpReward: overrides.xpReward ?? 0,
      isTitleEligible: overrides.isTitleEligible ?? false,
      assignmentLimit: overrides.assignmentLimit ?? null,
    },
  });

const grantBadge = async (userId: string, badgeId: string) =>
  prisma.userBadge.create({ data: { userId, badgeId } });

describe("badgeRepository.awardBadge", () => {
  it("awards a badge and grants no more than the assignment limit under concurrent requests", async () => {
    const badge = await createBadge({ assignmentLimit: 1, xpReward: 50 });
    const [userA, userB, userC] = await Promise.all([
      createUser("Racer A"),
      createUser("Racer B"),
      createUser("Racer C"),
    ]);

    const results = await Promise.all(
      [userA, userB, userC].map((user) =>
        badgeRepository.awardBadge({ userId: user.id, badgeId: badge.id }),
      ),
    );

    const awardedCount = results.filter((result) => result.awarded).length;
    expect(awardedCount).toBe(1);

    const storedBadge = await prisma.badge.findUniqueOrThrow({ where: { id: badge.id } });
    expect(storedBadge.assignmentCount).toBe(1);

    const userBadgeCount = await prisma.userBadge.count({ where: { badgeId: badge.id } });
    expect(userBadgeCount).toBe(1);
  });

  it("reports ALREADY_AWARDED, not ASSIGNMENT_LIMIT_REACHED, for a user who already holds a full badge", async () => {
    const badge = await createBadge({ assignmentLimit: 1 });
    const owner = await createUser("Existing Owner");
    await grantBadge(owner.id, badge.id);
    await prisma.badge.update({ where: { id: badge.id }, data: { assignmentCount: 1 } });

    const result = await badgeRepository.awardBadge({ userId: owner.id, badgeId: badge.id });

    expect(result).toEqual({ awarded: false, reason: "ALREADY_AWARDED" });
  });

  it("never touches assignmentCount for an unlimited badge", async () => {
    const badge = await createBadge({ assignmentLimit: null });
    const user = await createUser("Unlimited Recipient");

    const result = await badgeRepository.awardBadge({ userId: user.id, badgeId: badge.id });

    expect(result.awarded).toBe(true);
    const storedBadge = await prisma.badge.findUniqueOrThrow({ where: { id: badge.id } });
    expect(storedBadge.assignmentCount).toBe(0);
  });
});

describe("PATCH /api/badges/title", () => {
  it("sets a collected, title-eligible badge as the user's title", async () => {
    const user = await createUser("Title Setter");
    const badge = await createBadge({ isTitleEligible: true });
    await grantBadge(user.id, badge.id);

    const response = await request(testApp)
      .patch("/api/badges/title")
      .set("Authorization", authHeaderFor(user.id))
      .send({ badgeId: badge.id });

    expect(response.status).toBe(200);
    const stored = await prisma.userBadge.findUniqueOrThrow({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
    });
    expect(stored.isTitle).toBe(true);
  });

  it("rejects a collected badge that isn't title-eligible", async () => {
    const user = await createUser("Ineligible Setter");
    const badge = await createBadge({ isTitleEligible: false });
    await grantBadge(user.id, badge.id);

    const response = await request(testApp)
      .patch("/api/badges/title")
      .set("Authorization", authHeaderFor(user.id))
      .send({ badgeId: badge.id });

    expect(response.status).toBe(422);
  });

  it("rejects a title-eligible badge the user hasn't collected", async () => {
    const user = await createUser("Non Owner");
    const badge = await createBadge({ isTitleEligible: true });

    const response = await request(testApp)
      .patch("/api/badges/title")
      .set("Authorization", authHeaderFor(user.id))
      .send({ badgeId: badge.id });

    expect(response.status).toBe(422);
  });

  it("clears the title when badgeId is null", async () => {
    const user = await createUser("Title Clearer");
    const badge = await createBadge({ isTitleEligible: true });
    await grantBadge(user.id, badge.id);
    await prisma.userBadge.update({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
      data: { isTitle: true },
    });

    const response = await request(testApp)
      .patch("/api/badges/title")
      .set("Authorization", authHeaderFor(user.id))
      .send({ badgeId: null });

    expect(response.status).toBe(200);
    const stored = await prisma.userBadge.findUniqueOrThrow({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
    });
    expect(stored.isTitle).toBe(false);
  });

  it("clears the title when the titled badge is hidden", async () => {
    const user = await createUser("Title Hider");
    const badge = await createBadge({ isTitleEligible: true });
    await grantBadge(user.id, badge.id);
    await prisma.userBadge.update({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
      data: { isTitle: true },
    });

    const response = await request(testApp)
      .patch(`/api/badges/${badge.id}/display`)
      .set("Authorization", authHeaderFor(user.id))
      .send({ isDisplayed: false });

    expect(response.status).toBe(200);
    const stored = await prisma.userBadge.findUniqueOrThrow({
      where: { userId_badgeId: { userId: user.id, badgeId: badge.id } },
    });
    expect(stored.isTitle).toBe(false);
    expect(stored.isDisplayed).toBe(false);
  });

  it("requires authentication", async () => {
    const badge = await createBadge({ isTitleEligible: true });

    const response = await request(testApp).patch("/api/badges/title").send({ badgeId: badge.id });

    expect(response.status).toBe(401);
  });
});
