import { MAX_PLATFORM_CO_FOUNDERS } from "@outfiqe/utils";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { cacheService } from "#redis/cache.service.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";

import { PLATFORM_NAV_ACCESS_HIDDEN_KEYS_CACHE_KEY } from "./platform-nav-access.constants.js";

const promoteToCoFounder = async (userId: string): Promise<string> => {
  const platformOrganization = await crmAccessRepository.findPlatformOrganization();
  if (!platformOrganization) throw new Error("platform organization missing in fixture");
  const membership = await prisma.membership.update({
    where: { userId_organizationId: { userId, organizationId: platformOrganization.id } },
    data: { isPlatformSuperAdmin: true },
  });
  return membership.id;
};

beforeEach(async () => {
  await cacheService.invalidate(PLATFORM_NAV_ACCESS_HIDDEN_KEYS_CACHE_KEY);
});

describe("requirePlatformNavItem", () => {
  it("403s a non-co-founder on a hidden surface and 200s once it is visible again", async () => {
    const coFounder = await createAdminSession();
    await promoteToCoFounder(coFounder.userId);
    const plainAdmin = await createAdminSession();

    await request(testApp)
      .put("/api/platform/nav-access/hidden")
      .set("Authorization", coFounder.authHeader)
      .send({ hiddenNavKeys: ["gamification"] })
      .expect(200);

    await request(testApp)
      .get("/api/xp/levels")
      .set("Authorization", plainAdmin.authHeader)
      .expect(403);

    await request(testApp)
      .get("/api/xp/levels")
      .set("Authorization", coFounder.authHeader)
      .expect(200);

    await request(testApp)
      .put("/api/platform/nav-access/hidden")
      .set("Authorization", coFounder.authHeader)
      .send({ hiddenNavKeys: [] })
      .expect(200);
    await cacheService.invalidate(PLATFORM_NAV_ACCESS_HIDDEN_KEYS_CACHE_KEY);

    await request(testApp)
      .get("/api/xp/levels")
      .set("Authorization", plainAdmin.authHeader)
      .expect(200);
  });
});

describe("platform nav-access writes", () => {
  it("only a co-founder can change the hidden list, and the change is audited", async () => {
    const plainAdmin = await createAdminSession();
    await request(testApp)
      .put("/api/platform/nav-access/hidden")
      .set("Authorization", plainAdmin.authHeader)
      .send({ hiddenNavKeys: ["team"] })
      .expect(403);

    const coFounder = await createAdminSession();
    await promoteToCoFounder(coFounder.userId);

    await request(testApp)
      .put("/api/platform/nav-access/hidden")
      .set("Authorization", coFounder.authHeader)
      .send({ hiddenNavKeys: ["team", "organizations"] })
      .expect(200);

    const overview = await request(testApp)
      .get("/api/platform/nav-access")
      .set("Authorization", coFounder.authHeader)
      .expect(200);
    expect(overview.body.data.hiddenNavKeys.sort()).toEqual(["organizations", "team"]);
    expect(overview.body.data.isCoFounder).toBe(true);

    const auditRows = await prisma.platformAuditLog.findMany({
      where: { action: "nav-access.hidden-keys.set" },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0]?.actorUserId).toBe(coFounder.userId);
  });

  it("rejects an unknown nav key", async () => {
    const coFounder = await createAdminSession();
    await promoteToCoFounder(coFounder.userId);

    await request(testApp)
      .put("/api/platform/nav-access/hidden")
      .set("Authorization", coFounder.authHeader)
      .send({ hiddenNavKeys: ["not-a-real-nav-key"] })
      .expect(422);
  });

  it("caps the co-founder group at four and blocks removing the last one", async () => {
    const founders: Awaited<ReturnType<typeof createAdminSession>>[] = [];
    for (let index = 0; index < MAX_PLATFORM_CO_FOUNDERS; index += 1) {
      founders.push(await createAdminSession());
    }
    const membershipIds: string[] = [];
    for (const founder of founders) {
      membershipIds.push(await promoteToCoFounder(founder.userId));
    }

    const fifth = await createAdminSession();
    const fifthMembershipId = (
      await prisma.membership.findFirstOrThrow({ where: { userId: fifth.userId } })
    ).id;

    await request(testApp)
      .post("/api/platform/nav-access/co-founders")
      .set("Authorization", founders[0]!.authHeader)
      .send({ membershipId: fifthMembershipId })
      .expect(409);

    for (const membershipId of membershipIds.slice(1)) {
      await request(testApp)
        .delete(`/api/platform/nav-access/co-founders/${membershipId}`)
        .set("Authorization", founders[0]!.authHeader)
        .expect(200);
    }

    await request(testApp)
      .delete(`/api/platform/nav-access/co-founders/${membershipIds[0]}`)
      .set("Authorization", founders[0]!.authHeader)
      .expect(409);
  });
});

describe("GET /api/auth/me", () => {
  it("carries isCoFounder and hiddenPlatformNavKeys for a co-founder", async () => {
    const coFounder = await createAdminSession();
    await promoteToCoFounder(coFounder.userId);
    await request(testApp)
      .put("/api/platform/nav-access/hidden")
      .set("Authorization", coFounder.authHeader)
      .send({ hiddenNavKeys: ["financial-rollup"] })
      .expect(200);

    const me = await request(testApp)
      .get("/api/auth/me")
      .set("Authorization", coFounder.authHeader)
      .expect(200);

    expect(me.body.data.isCoFounder).toBe(true);
    expect(me.body.data.hiddenPlatformNavKeys).toEqual(["financial-rollup"]);
  });
});
