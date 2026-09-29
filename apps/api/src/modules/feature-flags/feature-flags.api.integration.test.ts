import { randomUUID } from "node:crypto";

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { FeatureFlagRollout, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { errorHandler } from "#middlewares/error-handler.js";
import { optionalAuth } from "#middlewares/optional-auth.js";
import {
  createAdminSession,
  createRoleLimitedStaffSession,
} from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { requireFeatureFlag } from "./feature-flags.middleware.js";
import { FEATURE_FLAG_KEYS } from "./feature-flags.registry.js";
import { featureFlagsService } from "./feature-flags.service.js";

const FLAGS_PATH = "/api/platform/feature-flags";
const OUTFIT_BUILDER_FLAG = "outfit_builder";
const PROBE_PATH = "/probe";
const OK_STATUS = 200;
const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;
const FORBIDDEN_STATUS = 403;

const probeApp = express()
  .get(PROBE_PATH, optionalAuth, requireFeatureFlag(OUTFIT_BUILDER_FLAG), (_req, res) => {
    res.json({ reached: true });
  })
  .use(errorHandler);

const createShopper = async () => {
  const suffix = randomUUID().slice(0, 8);
  const shopper = await prisma.user.create({
    data: {
      email: `flag-${suffix}@outfiqe.test`,
      name: "Flag Tester",
      handle: `flag-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
  const { accessToken } = generateTokenpair({ sub: shopper.id, role: UserRole.CUSTOMER });
  return { shopper, authHeader: `Bearer ${accessToken}` };
};

const createBrandWithMember = async (userId: string) => {
  const brand = await prisma.brand.create({
    data: {
      name: `Flag Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  await prisma.brandMembership.create({ data: { userId, brandId: brand.id } });
  return brand;
};

const setOutfitBuilderFlag = (
  authHeader: string,
  body: { rollout: FeatureFlagRollout; allowedUserIds?: string[]; allowedBrandIds?: string[] },
) =>
  request(testApp)
    .put(`${FLAGS_PATH}/${OUTFIT_BUILDER_FLAG}`)
    .set("Authorization", authHeader)
    .send({ allowedUserIds: [], allowedBrandIds: [], ...body });

beforeEach(() => {
  for (const key of FEATURE_FLAG_KEYS) featureFlagsService.invalidate(key);
});

describe("feature flags API", () => {
  it("lists every flag switched off before anything is saved", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp).get(FLAGS_PATH).set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.map((flag: { key: string }) => flag.key)).toEqual(FEATURE_FLAG_KEYS);
    for (const flag of response.body.data) {
      expect(flag).toMatchObject({ rollout: FeatureFlagRollout.OFF, allowedUserIds: [] });
    }
  });

  it("saves an allow list, removes duplicates and audits the before and after", async () => {
    const { authHeader, userId: adminId } = await createAdminSession();
    const { shopper } = await createShopper();

    const response = await setOutfitBuilderFlag(authHeader, {
      rollout: FeatureFlagRollout.ALLOW_LIST,
      allowedUserIds: [shopper.id, shopper.id],
    });

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.after).toEqual({
      rollout: FeatureFlagRollout.ALLOW_LIST,
      allowedUserIds: [shopper.id],
      allowedBrandIds: [],
    });
    const auditEntry = await prisma.platformAuditLog.findFirstOrThrow({
      where: { actorUserId: adminId, targetId: OUTFIT_BUILDER_FLAG },
    });
    expect(auditEntry.metadata).toMatchObject({
      before: { rollout: FeatureFlagRollout.OFF },
      after: { rollout: FeatureFlagRollout.ALLOW_LIST },
    });
  });

  it("refuses allow-list ids for people or brands that don't exist", async () => {
    const { authHeader } = await createAdminSession();
    const unknownUserId = randomUUID();

    const response = await setOutfitBuilderFlag(authHeader, {
      rollout: FeatureFlagRollout.ALLOW_LIST,
      allowedUserIds: [unknownUserId],
    });

    expect(response.status).toBe(UNPROCESSABLE_STATUS);
    expect(response.body.details).toEqual({ unknownUserIds: [unknownUserId], unknownBrandIds: [] });
  });

  it("refuses staff whose role lacks platform:flags:manage", async () => {
    const { authHeader } = await createRoleLimitedStaffSession("platform:settings:manage");

    const response = await setOutfitBuilderFlag(authHeader, {
      rollout: FeatureFlagRollout.EVERYONE,
    });

    expect(response.status).toBe(FORBIDDEN_STATUS);
  });
});

describe("requireFeatureFlag", () => {
  it("hides the route from everyone while the flag is off", async () => {
    const { authHeader } = await createShopper();

    const signedIn = await request(probeApp).get(PROBE_PATH).set("Authorization", authHeader);
    const anonymous = await request(probeApp).get(PROBE_PATH);

    expect(signedIn.status).toBe(NOT_FOUND_STATUS);
    expect(anonymous.status).toBe(NOT_FOUND_STATUS);
  });

  it("lets through allow-listed people and members of allow-listed brands, nobody else", async () => {
    const { authHeader: adminAuth } = await createAdminSession();
    const allowedPerson = await createShopper();
    const brandMember = await createShopper();
    const outsider = await createShopper();
    const brand = await createBrandWithMember(brandMember.shopper.id);
    await setOutfitBuilderFlag(adminAuth, {
      rollout: FeatureFlagRollout.ALLOW_LIST,
      allowedUserIds: [allowedPerson.shopper.id],
      allowedBrandIds: [brand.id],
    });

    const statusFor = async (authHeader: string) =>
      (await request(probeApp).get(PROBE_PATH).set("Authorization", authHeader)).status;

    expect(await statusFor(allowedPerson.authHeader)).toBe(OK_STATUS);
    expect(await statusFor(brandMember.authHeader)).toBe(OK_STATUS);
    expect(await statusFor(outsider.authHeader)).toBe(NOT_FOUND_STATUS);
  });

  it("switches off at once for everyone when the rollout goes back to OFF, keeping the lists", async () => {
    const { authHeader: adminAuth } = await createAdminSession();
    const allowedPerson = await createShopper();
    await setOutfitBuilderFlag(adminAuth, {
      rollout: FeatureFlagRollout.ALLOW_LIST,
      allowedUserIds: [allowedPerson.shopper.id],
    });

    await setOutfitBuilderFlag(adminAuth, {
      rollout: FeatureFlagRollout.OFF,
      allowedUserIds: [allowedPerson.shopper.id],
    });

    const response = await request(probeApp)
      .get(PROBE_PATH)
      .set("Authorization", allowedPerson.authHeader);
    expect(response.status).toBe(NOT_FOUND_STATUS);
    const storedFlag = await prisma.featureFlag.findUniqueOrThrow({
      where: { key: OUTFIT_BUILDER_FLAG },
    });
    expect(storedFlag.allowedUserIds).toEqual([allowedPerson.shopper.id]);
  });

  it("lets everyone through, even signed-out visitors, when the rollout is EVERYONE", async () => {
    const { authHeader } = await createAdminSession();
    await setOutfitBuilderFlag(authHeader, { rollout: FeatureFlagRollout.EVERYONE });

    const response = await request(probeApp).get(PROBE_PATH);

    expect(response.status).toBe(OK_STATUS);
  });
});
