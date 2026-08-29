import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CreatorLeaderboardCategory, CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { previousIsoWeekKey } from "#lib/iso-week.utils.js";
import { creatorLeaderboardRepository } from "#modules/creator-leaderboard/creatorLeaderboard.repository.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

import { creatorCompetitionService } from "./creatorCompetition.service.js";

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createUser = async () =>
  prisma.user.create({
    data: {
      email: `competition-${randomUUID()}@outfiqe.test`,
      name: "Competition Tester",
      handle: `competition-${randomUUID().slice(0, 8)}`,
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
  const admin = await createUser();
  await ensurePlatformOrganizationExists();
  await crmAccessService.grantPlatformStaffMembership(admin.id);
  return { ...admin, header: authHeaderFor(admin.id, UserRole.ADMIN) };
};

const validCompetitionPayload = (overrides: Record<string, unknown> = {}) => ({
  name: `Weekly Sprint ${randomUUID()}`,
  description: "Top likes wins each week.",
  category: "SPECIAL",
  rarity: "RARE",
  icon: "🏆",
  designConfig: { shape: "star", primaryColor: "#f97316" },
  xpReward: 50,
  isPermanent: true,
  isPublic: true,
  isTitleEligible: false,
  leaderboardCategory: "MOST_LIKES",
  topN: 3,
  ...overrides,
});

const seedPreviousWeekScores = async (
  category: CreatorLeaderboardCategory,
  entries: { member: string; score: number }[],
) =>
  creatorLeaderboardRepository.replaceWeeklyScores(
    category,
    previousIsoWeekKey(new Date()),
    entries,
  );

const createCompetitionDirect = async (
  leaderboardCategory: CreatorLeaderboardCategory,
  topN: number,
) => {
  const badge = await prisma.badge.create({
    data: {
      name: `Direct Competition Badge ${randomUUID()}`,
      description: "Awarded to weekly competition winners.",
      category: "SPECIAL",
      rarity: "RARE",
      icon: "🏆",
      designConfig: { shape: "star", primaryColor: "#f97316" },
      xpReward: 40,
    },
  });
  const competition = await prisma.creatorCompetition.create({
    data: {
      name: `Direct Competition ${randomUUID()}`,
      category: leaderboardCategory,
      topN,
      badgeId: badge.id,
    },
  });
  return { competition, badge };
};

describe("creatorCompetitionService.settleWeeklyCompetitions", () => {
  it("awards the badge to the top N creators from the just-ended week", async () => {
    const [first, second, third, fourth] = await Promise.all([
      createUser(),
      createUser(),
      createUser(),
      createUser(),
    ]);
    const { badge } = await createCompetitionDirect(CreatorLeaderboardCategory.MOST_LIKES, 2);
    await seedPreviousWeekScores(CreatorLeaderboardCategory.MOST_LIKES, [
      { member: first.id, score: 400 },
      { member: second.id, score: 300 },
      { member: third.id, score: 200 },
      { member: fourth.id, score: 100 },
    ]);

    await creatorCompetitionService.settleWeeklyCompetitions(new Date());

    const winnerBadges = await prisma.userBadge.findMany({ where: { badgeId: badge.id } });
    const winnerIds = winnerBadges.map((row) => row.userId).sort();
    expect(winnerIds).toEqual([first.id, second.id].sort());

    const thirdBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId: third.id, badgeId: badge.id } },
    });
    expect(thirdBadge).toBeNull();
  });

  it("grants the badge's XP reward to each winner", async () => {
    const winner = await createUser();
    const { badge } = await createCompetitionDirect(CreatorLeaderboardCategory.TOP_XP, 1);
    await prisma.level.create({
      data: { level: 1, name: "Competition Test Floor", requiredXp: 0 },
    });
    await seedPreviousWeekScores(CreatorLeaderboardCategory.TOP_XP, [
      { member: winner.id, score: 1000 },
    ]);

    await creatorCompetitionService.settleWeeklyCompetitions(new Date());

    const progress = await prisma.userProgress.findUnique({ where: { userId: winner.id } });
    expect(progress?.totalXp).toBe(badge.xpReward);
  });

  it("skips a competition tied to a currently disabled leaderboard category", async () => {
    const winner = await createUser();
    const { badge } = await createCompetitionDirect(CreatorLeaderboardCategory.TOP_SELLER, 1);
    await prisma.creatorLeaderboardCategoryConfig.upsert({
      where: { category: CreatorLeaderboardCategory.TOP_SELLER },
      create: { category: CreatorLeaderboardCategory.TOP_SELLER, enabled: false },
      update: { enabled: false },
    });
    await seedPreviousWeekScores(CreatorLeaderboardCategory.TOP_SELLER, [
      { member: winner.id, score: 500 },
    ]);

    await creatorCompetitionService.settleWeeklyCompetitions(new Date());

    const winnerBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId: winner.id, badgeId: badge.id } },
    });
    expect(winnerBadge).toBeNull();
  });

  it("does not award a deactivated competition's badge", async () => {
    const winner = await createUser();
    const { competition, badge } = await createCompetitionDirect(
      CreatorLeaderboardCategory.MOST_ENGAGED,
      1,
    );
    await prisma.creatorCompetition.update({
      where: { id: competition.id },
      data: { isActive: false },
    });
    await seedPreviousWeekScores(CreatorLeaderboardCategory.MOST_ENGAGED, [
      { member: winner.id, score: 500 },
    ]);

    await creatorCompetitionService.settleWeeklyCompetitions(new Date());

    const winnerBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId: winner.id, badgeId: badge.id } },
    });
    expect(winnerBadge).toBeNull();
  });

  it("leaves an already-won badge untouched when the same creator wins again", async () => {
    const winner = await createUser();
    const { badge } = await createCompetitionDirect(
      CreatorLeaderboardCategory.MOST_ACHIEVEMENTS,
      1,
    );
    await prisma.userBadge.create({ data: { userId: winner.id, badgeId: badge.id } });
    await seedPreviousWeekScores(CreatorLeaderboardCategory.MOST_ACHIEVEMENTS, [
      { member: winner.id, score: 500 },
    ]);

    await creatorCompetitionService.settleWeeklyCompetitions(new Date());

    const rows = await prisma.userBadge.findMany({
      where: { userId: winner.id, badgeId: badge.id },
    });
    expect(rows).toHaveLength(1);
  });
});

describe("creator competitions admin API", () => {
  it("creates, lists, and updates a competition", async () => {
    const admin = await createAdmin();

    const createResponse = await request(testApp)
      .post("/api/creator-competitions")
      .set("Authorization", admin.header)
      .send(validCompetitionPayload());

    expect(createResponse.status).toBe(201);
    const competitionId = createResponse.body.data.id;
    expect(createResponse.body.data.badge.category).toBe("SPECIAL");
    expect(createResponse.body.data.category).toBe("MOST_LIKES");

    const listResponse = await request(testApp)
      .get("/api/creator-competitions/admin")
      .set("Authorization", admin.header);
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data.some((row: { id: string }) => row.id === competitionId)).toBe(
      true,
    );

    const updateResponse = await request(testApp)
      .patch(`/api/creator-competitions/${competitionId}`)
      .set("Authorization", admin.header)
      .send({
        ...validCompetitionPayload({ leaderboardCategory: "TOP_CREATOR" }),
        isActive: false,
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.isActive).toBe(false);
    expect(updateResponse.body.data.category).toBe("TOP_CREATOR");
  });

  it("public list only returns active competitions with an active badge", async () => {
    const admin = await createAdmin();
    const createResponse = await request(testApp)
      .post("/api/creator-competitions")
      .set("Authorization", admin.header)
      .send(validCompetitionPayload());
    const competitionId = createResponse.body.data.id;

    const publicResponse = await request(testApp).get("/api/creator-competitions");
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.body.data.some((row: { id: string }) => row.id === competitionId)).toBe(
      true,
    );

    await request(testApp)
      .patch(`/api/creator-competitions/${competitionId}`)
      .set("Authorization", admin.header)
      .send({ ...validCompetitionPayload(), isActive: false });

    const afterDeactivate = await request(testApp).get("/api/creator-competitions");
    expect(afterDeactivate.body.data.some((row: { id: string }) => row.id === competitionId)).toBe(
      false,
    );
  });
});
