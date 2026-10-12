import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import {
  CreatorStatus,
  FollowTargetType,
  ImageProcessingPriorityTier,
  ImageProcessingQualityTier,
  ImageProcessingStatus,
  ProductStatus,
  TagReviewStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";

import { seedPlatformOrganization } from "./crm-fixtures.js";
import { ensureProductType } from "./product-fixtures.js";
import { uniquePhone } from "./unique-values.js";

export const createCreator = async (name: string, handle: string) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      isCreator: true,
      creatorStatus: CreatorStatus.APPROVED,
    },
  });

export const createPlainUser = async (name: string, handle: string) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
    },
  });

export const createUserWithRole = async (
  name: string,
  handle: string,
  role: UserRole,
  overrides: { isCreator?: boolean; creatorStatus?: CreatorStatus } = {},
) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
      ...overrides,
    },
  });

const seedPlatformAdminRole = async () => {
  const { organization, adminRole } = await seedPlatformOrganization();
  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });
  await prisma.rolePermission.createMany({
    data: PLATFORM_PERMISSION_KEYS.map((permissionKey) => ({
      roleId: adminRole.id,
      permissionKey,
    })),
    skipDuplicates: true,
  });
  return { organization, adminRole };
};

export const createContentModerator = async (name: string, handle: string) => {
  const { organization, adminRole } = await seedPlatformAdminRole();
  const moderator = await createUserWithRole(name, handle, UserRole.ADMIN);
  await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: moderator.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  return moderator;
};

export const createLook = async (creatorId: string, caption: string) =>
  prisma.creatorLook.create({
    data: {
      creatorId,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
      caption,
    },
  });

const createBrand = async (name: string) =>
  prisma.brand.create({
    data: {
      name,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

export const createApprovedProduct = async (name: string, price = 1000) => {
  const brand = await createBrand(`${name} Brand`);
  return prisma.product.create({
    data: {
      brandId: brand.id,
      name,
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });
};

export const createPendingProduct = async (name: string, price = 1000) => {
  const brand = await createBrand(`${name} Brand`);
  return prisma.product.create({
    data: {
      brandId: brand.id,
      name,
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.PENDING,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });
};

export const createImageAsset = async (ownerId: string) =>
  prisma.imageProcessingAsset.create({
    data: {
      ownerId,
      checksum: randomUUID().replace(/-/g, ""),
      priorityTier: ImageProcessingPriorityTier.STANDARD,
      qualityTier: ImageProcessingQualityTier.STANDARD,
      status: ImageProcessingStatus.PENDING,
      tempStorageKey: `temp/${randomUUID()}.jpg`,
    },
  });

export const tagProduct = async (lookId: string, productId: string, sizeWorn = "M") =>
  prisma.creatorLookProduct.create({
    data: { creatorLookId: lookId, productId, sizeWorn, reviewStatus: TagReviewStatus.APPROVED },
  });

export const followCreator = async (followerId: string, creatorId: string) =>
  prisma.follow.create({
    data: { followerId, followingType: FollowTargetType.USER, followingId: creatorId },
  });

export const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};
