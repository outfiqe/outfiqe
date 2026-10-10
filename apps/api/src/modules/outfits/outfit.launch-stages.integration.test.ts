import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { FeatureFlagRollout } from "#generated/prisma/enums.js";
import { FEATURE_FLAG_KEYS } from "#modules/feature-flags/feature-flags.registry.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import {
  createOutfitUser,
  type OutfitTestUser,
  readBuild,
  seedOutfitSlotTypes,
  startBuild,
} from "#test/integration/outfit-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

const OUTFIT_BUILDER_FLAG = "outfit_builder";

type LaunchStage = {
  rollout: FeatureFlagRollout;
  allowedUserIds?: string[];
  allowedBrandIds?: string[];
};

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  for (const key of FEATURE_FLAG_KEYS) featureFlagsService.invalidate(key);
  await seedOutfitSlotTypes();
});

const createBrandFor = async (member: OutfitTestUser): Promise<string> => {
  const brand = await prisma.brand.create({
    data: {
      name: `Beta Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Beta Contact",
      email: `${randomUUID()}@beta.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  await prisma.brandMembership.create({ data: { userId: member.id, brandId: brand.id } });
  return brand.id;
};

const moveToStage = async (adminAuth: string, stage: LaunchStage) => {
  const response = await request(testApp)
    .put(`/api/platform/feature-flags/${OUTFIT_BUILDER_FLAG}`)
    .set("Authorization", adminAuth)
    .send({ allowedUserIds: [], allowedBrandIds: [], ...stage });
  expect(response.status).toBe(HTTP_STATUS.OK);
};

const startBuildStatus = async (person: OutfitTestUser) => (await startBuild(person)).status;

const seesOutfitBuild = async (person: OutfitTestUser) => {
  const response = await request(testApp)
    .get("/api/feature-flags/mine")
    .set("Authorization", person.auth);
  return response.body.data.enabledKeys.includes(OUTFIT_BUILDER_FLAG);
};

describe("Outfit Build launch stages", () => {
  it("moves from held back to team only, beta and everyone, keeping earlier builds", async () => {
    const { authHeader: adminAuth } = await createAdminSession();
    const teamMember = await createOutfitUser("Team");
    const betaBrandOwner = await createOutfitUser("Brand");
    const betaCreator = await createOutfitUser("Creator");
    const shopper = await createOutfitUser("Shopper");
    const betaBrandId = await createBrandFor(betaBrandOwner);

    expect(await startBuildStatus(teamMember)).toBe(HTTP_STATUS.NOT_FOUND);
    expect(await seesOutfitBuild(teamMember)).toBe(false);

    await moveToStage(adminAuth, {
      rollout: FeatureFlagRollout.ALLOW_LIST,
      allowedUserIds: [teamMember.id],
    });
    const teamBuild = await startBuild(teamMember);
    expect(teamBuild.status).toBe(HTTP_STATUS.CREATED);
    expect(await seesOutfitBuild(teamMember)).toBe(true);
    expect(await startBuildStatus(betaBrandOwner)).toBe(HTTP_STATUS.NOT_FOUND);
    expect(await startBuildStatus(shopper)).toBe(HTTP_STATUS.NOT_FOUND);

    await moveToStage(adminAuth, {
      rollout: FeatureFlagRollout.ALLOW_LIST,
      allowedUserIds: [teamMember.id, betaCreator.id],
      allowedBrandIds: [betaBrandId],
    });
    expect(await startBuildStatus(betaBrandOwner)).toBe(HTTP_STATUS.CREATED);
    expect(await startBuildStatus(betaCreator)).toBe(HTTP_STATUS.CREATED);
    expect(await seesOutfitBuild(betaBrandOwner)).toBe(true);
    expect(await startBuildStatus(shopper)).toBe(HTTP_STATUS.NOT_FOUND);
    expect(await seesOutfitBuild(shopper)).toBe(false);
    expect((await readBuild(teamMember, teamBuild.body.data.id)).status).toBe(HTTP_STATUS.OK);

    await moveToStage(adminAuth, { rollout: FeatureFlagRollout.EVERYONE });
    expect(await startBuildStatus(shopper)).toBe(HTTP_STATUS.CREATED);
    expect(await seesOutfitBuild(shopper)).toBe(true);
    expect((await readBuild(teamMember, teamBuild.body.data.id)).status).toBe(HTTP_STATUS.OK);
  });

  it("takes a beta tester back out the moment they leave the allow list", async () => {
    const { authHeader: adminAuth } = await createAdminSession();
    const betaCreator = await createOutfitUser("Creator");
    await moveToStage(adminAuth, {
      rollout: FeatureFlagRollout.ALLOW_LIST,
      allowedUserIds: [betaCreator.id],
    });
    const betaBuild = await startBuild(betaCreator);
    expect(betaBuild.status).toBe(HTTP_STATUS.CREATED);

    await moveToStage(adminAuth, { rollout: FeatureFlagRollout.ALLOW_LIST });

    expect((await readBuild(betaCreator, betaBuild.body.data.id)).status).toBe(
      HTTP_STATUS.NOT_FOUND,
    );
    expect(await seesOutfitBuild(betaCreator)).toBe(false);
  });
});
