import { randomUUID } from "node:crypto";

import request from "supertest";

import { IDEMPOTENCY_HEADER, OUTFIT_VERSION_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  ConversationType,
  FeatureFlagRollout,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import type { FeatureFlagKey } from "#modules/feature-flags/feature-flags.registry.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";

import { ensureProductType } from "./product-fixtures.js";
import { testApp } from "./test-app.js";
import { uniquePhone } from "./unique-values.js";

export type OutfitTestUser = { id: string; name: string; auth: string };

type HttpMethod = "put" | "post" | "patch" | "delete";

const DEFAULT_STOCK = 5;

export const createOutfitUser = async (
  name: string,
  role: UserRole = UserRole.CUSTOMER,
): Promise<OutfitTestUser> => {
  const suffix = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: {
      email: `outfit-${suffix}@outfiqe.test`,
      name,
      handle: `outfit-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
  const { accessToken } = generateTokenpair({ sub: user.id, role });
  return { id: user.id, name, auth: `Bearer ${accessToken}` };
};

const createOutfitBrand = async (): Promise<string> => {
  const brand = await prisma.brand.create({
    data: {
      name: `Build Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  return brand.id;
};

export const createOutfitProduct = async (
  productTypeSlug: string,
  {
    price = 1_000,
    stock = DEFAULT_STOCK,
    brandId,
  }: { price?: number; stock?: number; brandId?: string } = {},
) => {
  return prisma.product.create({
    data: {
      brandId: brandId ?? (await createOutfitBrand()),
      name: `${productTypeSlug} ${randomUUID().slice(0, 4)}`,
      price,
      productTypeId: await ensureProductType(productTypeSlug),
      status: ProductStatus.APPROVED,
      sizes: { create: [{ label: "M", stock }] },
    },
  });
};

export const seedOutfitSlotTypes = async (): Promise<void> => {
  await prisma.outfitSlotType.deleteMany();
  const [topsId, bottomsId, dressesId, footwearId] = await Promise.all([
    ensureProductType("tops"),
    ensureProductType("bottoms"),
    ensureProductType("dresses"),
    ensureProductType("footwear"),
  ]);
  const top = await prisma.outfitSlotType.create({
    data: {
      key: "top",
      label: "Top",
      icon: "shirt",
      maxItems: 1,
      sortOrder: 0,
      productTypes: { create: [{ productTypeId: topsId }] },
    },
  });
  const bottom = await prisma.outfitSlotType.create({
    data: {
      key: "bottom",
      label: "Bottom",
      icon: "trousers",
      maxItems: 1,
      sortOrder: 1,
      productTypes: { create: [{ productTypeId: bottomsId }] },
    },
  });
  await prisma.outfitSlotType.create({
    data: {
      key: "full-outfit",
      label: "Full Outfit",
      icon: "dress",
      maxItems: 1,
      sortOrder: 2,
      productTypes: { create: [{ productTypeId: dressesId }] },
      blocks: {
        create: [{ blockedSlotTypeId: top.id }, { blockedSlotTypeId: bottom.id }],
      },
    },
  });
  await prisma.outfitSlotType.create({
    data: {
      key: "footwear",
      label: "Footwear",
      icon: "footwear",
      maxItems: 1,
      sortOrder: 3,
      productTypes: { create: [{ productTypeId: footwearId }] },
    },
  });
  await prisma.outfitSlotType.create({
    data: {
      key: "extra",
      label: "Extra",
      icon: "sparkles",
      maxItems: 3,
      acceptsAnyProductType: true,
      sortOrder: 4,
    },
  });
};

export const setFeatureFlagRollout = async (
  key: FeatureFlagKey,
  rollout: FeatureFlagRollout,
): Promise<void> => {
  await prisma.featureFlag.upsert({
    where: { key },
    create: { key, rollout },
    update: { rollout },
  });
  featureFlagsService.invalidate(key);
};

export const turnOutfitBuilderOn = () =>
  setFeatureFlagRollout("outfit_builder", FeatureFlagRollout.EVERYONE);

export const overrideOutfitSetting = async (key: string, value: number): Promise<void> => {
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  platformSettingsService.invalidate();
};

export const createDirectConversation = async (first: OutfitTestUser, second: OutfitTestUser) =>
  prisma.conversation.create({
    data: {
      type: ConversationType.DIRECT,
      directKey: [first.id, second.id].sort().join(":"),
      participants: { create: [{ userId: first.id }, { userId: second.id }] },
    },
  });

export const startBuild = (
  owner: OutfitTestUser,
  body: Record<string, unknown> = {},
  idempotencyKey: string = randomUUID(),
) =>
  request(testApp)
    .post("/api/outfits")
    .set("Authorization", owner.auth)
    .set(IDEMPOTENCY_HEADER, idempotencyKey)
    .send(body);

export const startBuildOrFail = async (owner: OutfitTestUser): Promise<string> => {
  const response = await startBuild(owner);
  if (response.status !== 201) {
    throw new Error(`Starting a build failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return response.body.data.id;
};

export const writeToBuild = (
  caller: OutfitTestUser,
  method: HttpMethod,
  path: string,
  version: number,
  body?: Record<string, unknown>,
  idempotencyKey: string = randomUUID(),
) => {
  const pending = request(testApp)
    [method](`/api/outfits${path}`)
    .set("Authorization", caller.auth)
    .set(IDEMPOTENCY_HEADER, idempotencyKey)
    .set(OUTFIT_VERSION_HEADER, String(version));
  return body ? pending.send(body) : pending;
};

export const readBuild = (caller: OutfitTestUser, outfitId: string) =>
  request(testApp).get(`/api/outfits/${outfitId}`).set("Authorization", caller.auth);

export const currentBuildVersion = async (outfitId: string): Promise<number> =>
  (await prisma.outfit.findUniqueOrThrow({ where: { id: outfitId } })).version;
