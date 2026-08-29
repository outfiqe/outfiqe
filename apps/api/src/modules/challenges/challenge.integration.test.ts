import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { achievementService } from "#modules/achievements/achievement.service.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
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

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createAdmin = async () => {
  const admin = await createUser("Test Admin");
  await ensurePlatformOrganizationExists();
  await crmAccessService.grantPlatformStaffMembership(admin.id);
  return { ...admin, header: authHeaderFor(admin.id, UserRole.ADMIN) };
};

const HOUR_MS = 60 * 60 * 1000;

const validChallengePayload = (overrides: Record<string, unknown> = {}) => ({
  name: `Sprint Star ${randomUUID()}`,
  description: "Earned by finishing the sprint.",
  category: "ENGAGEMENT",
  rarity: "RARE",
  icon: "🏃",
  designConfig: { shape: "circle", primaryColor: "#123456" },
  xpReward: 75,
  isPermanent: true,
  isPublic: true,
  isTitleEligible: false,
  requirementType: "ENGAGEMENT",
  conditions: [{ metric: "total_likes", operator: "gte", value: 5 }],
  activeFrom: new Date(Date.now() - HOUR_MS).toISOString(),
  activeUntil: new Date(Date.now() + HOUR_MS).toISOString(),
  challengeName: `August Sprint ${randomUUID()}`,
  challengeDescription: "Post looks and rack up likes before the week ends.",
  bannerImageUrl: null,
  ...overrides,
});

const createChallenge = async (
  admin: { header: string },
  overrides: Record<string, unknown> = {},
) => {
  const response = await request(testApp)
    .post("/api/challenges")
    .set("Authorization", admin.header)
    .send(validChallengePayload(overrides));
  return response.body.data as {
    id: string;
    badge: { id: string };
    achievement: { id: string };
  };
};

describe("POST /api/challenges (admin)", () => {
  it("creates the badge, achievement and challenge together", async () => {
    const admin = await createAdmin();
    const payload = validChallengePayload();

    const response = await request(testApp)
      .post("/api/challenges")
      .set("Authorization", admin.header)
      .send(payload);

    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe(payload.challengeName);
    expect(response.body.data.badge.name).toBe(payload.name);
    expect(response.body.data.achievement.requirementType).toBe("ENGAGEMENT");
    expect(response.body.data.achievement.conditions).toHaveLength(1);
    expect(response.body.data.achievement.activeFrom).not.toBeNull();
    expect(response.body.data.achievement.activeUntil).not.toBeNull();
  });

  it("rejects a challenge that ends before it starts", async () => {
    const admin = await createAdmin();
    const now = Date.now();

    const response = await request(testApp)
      .post("/api/challenges")
      .set("Authorization", admin.header)
      .send(
        validChallengePayload({
          activeFrom: new Date(now + HOUR_MS).toISOString(),
          activeUntil: new Date(now).toISOString(),
        }),
      );

    expect(response.status).toBe(422);
  });

  it("requires the ADMIN role", async () => {
    const nonAdmin = await createUser("Not An Admin");

    const response = await request(testApp)
      .post("/api/challenges")
      .set("Authorization", authHeaderFor(nonAdmin.id))
      .send(validChallengePayload());

    expect(response.status).toBe(403);
  });
});

describe("PATCH /api/challenges/:challengeId (admin)", () => {
  it("updates the badge, achievement and challenge together", async () => {
    const admin = await createAdmin();
    const challenge = await createChallenge(admin);

    const response = await request(testApp)
      .patch(`/api/challenges/${challenge.id}`)
      .set("Authorization", admin.header)
      .send(
        validChallengePayload({
          challengeName: "Renamed challenge",
          isActive: true,
          achievementIsActive: false,
        }),
      );

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("Renamed challenge");
    expect(response.body.data.achievement.isActive).toBe(false);
  });
});

describe("GET /api/challenges (public)", () => {
  it("lists an active challenge without personal data for an anonymous visitor", async () => {
    const admin = await createAdmin();
    const challenge = await createChallenge(admin);

    const response = await request(testApp).get("/api/challenges");

    expect(response.status).toBe(200);
    const listed = response.body.data.find((entry: { id: string }) => entry.id === challenge.id);
    expect(listed).toBeDefined();
    expect(listed.status).toBe("OPEN");
    expect(listed.isCompleted).toBeNull();
    expect(listed.conditions).toBeNull();
  });

  it("shows progress and completion state for a logged-in user", async () => {
    const admin = await createAdmin();
    const challenge = await createChallenge(admin);
    const user = await createUser("Challenge Participant");

    await prisma.creatorLook.create({
      data: { creatorId: user.id, imageUrl: "https://example.test/look.jpg", likeCount: 3 },
    });

    const before = await request(testApp)
      .get("/api/challenges")
      .set("Authorization", authHeaderFor(user.id));
    const beforeEntry = before.body.data.find((entry: { id: string }) => entry.id === challenge.id);
    expect(beforeEntry.isCompleted).toBe(false);
    expect(beforeEntry.conditions[0]).toMatchObject({ metric: "total_likes", currentValue: 3 });

    await prisma.creatorLook.updateMany({ where: { creatorId: user.id }, data: { likeCount: 10 } });
    await achievementService.evaluateForUser(user.id);

    const after = await request(testApp)
      .get("/api/challenges")
      .set("Authorization", authHeaderFor(user.id));
    const afterEntry = after.body.data.find((entry: { id: string }) => entry.id === challenge.id);
    expect(afterEntry.isCompleted).toBe(true);

    const userBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId: user.id, badgeId: challenge.badge.id } },
    });
    expect(userBadge).not.toBeNull();
  });

  it("excludes a challenge an admin has deactivated", async () => {
    const admin = await createAdmin();
    const challenge = await createChallenge(admin);
    await request(testApp)
      .patch(`/api/challenges/${challenge.id}`)
      .set("Authorization", admin.header)
      .send(validChallengePayload({ isActive: false, achievementIsActive: true }));

    const response = await request(testApp).get("/api/challenges");

    const listed = response.body.data.find((entry: { id: string }) => entry.id === challenge.id);
    expect(listed).toBeUndefined();
  });
});

describe("GET /api/challenges/:challengeId (public)", () => {
  it("404s for a challenge that doesn't exist", async () => {
    const response = await request(testApp).get(`/api/challenges/${randomUUID()}`);
    expect(response.status).toBe(404);
  });

  it("404s for a challenge an admin has deactivated", async () => {
    const admin = await createAdmin();
    const challenge = await createChallenge(admin);
    await request(testApp)
      .patch(`/api/challenges/${challenge.id}`)
      .set("Authorization", admin.header)
      .send(validChallengePayload({ isActive: false, achievementIsActive: true }));

    const response = await request(testApp).get(`/api/challenges/${challenge.id}`);
    expect(response.status).toBe(404);
  });
});
