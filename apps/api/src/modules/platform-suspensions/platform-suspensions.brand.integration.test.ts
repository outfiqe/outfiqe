import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BrandRole, ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";
import { seedPlatformOrganization } from "#test/integration/crmFixtures.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createUser = async (role: UserRole = UserRole.CUSTOMER) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `brand-suspensions-${suffix}@outfiqe.test`,
      name: "Test Person",
      handle: `brand-suspensions-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
};

const createBrand = async () =>
  prisma.brand.create({
    data: {
      name: `Test Brand ${randomUUID().slice(0, 8)}`,
      contactName: "Contact Person",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createBrandOwner = async (brandId: string) => {
  const owner = await createUser(UserRole.BRAND_OWNER);
  await prisma.brandMembership.create({
    data: { userId: owner.id, brandId, role: BrandRole.OWNER },
  });
  return owner;
};

const createApprovedProductForBrand = async (brandId: string) =>
  prisma.product.create({
    data: {
      brandId,
      name: `Product ${randomUUID().slice(0, 8)}`,
      price: 1000,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });

const seedPlatformAdmin = async () => {
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
  const admin = await createUser(UserRole.ADMIN);
  await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: admin.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  return admin;
};

describe("platform suspensions — brands", () => {
  let adminAuth: string;

  beforeEach(async () => {
    const admin = await seedPlatformAdmin();
    adminAuth = authHeaderFor(admin.id, UserRole.ADMIN);
  });

  it("hides a suspended brand's products from its public storefront and restores them on unsuspend", async () => {
    const brand = await createBrand();
    const product = await createApprovedProductForBrand(brand.id);

    const before = await request(testApp).get(`/api/brands/${brand.id}/products`);
    expect(before.status).toBe(200);
    expect(before.body.data.products.map((p: { id: string }) => p.id)).toContain(product.id);

    await request(testApp)
      .post(`/api/platform/brands/${brand.id}/suspend`)
      .set("Authorization", adminAuth)
      .send({ reason: "Counterfeit reports" });

    const during = await request(testApp).get(`/api/brands/${brand.id}/products`);
    expect(during.body.data.products.map((p: { id: string }) => p.id)).not.toContain(product.id);

    await request(testApp)
      .post(`/api/platform/brands/${brand.id}/unsuspend`)
      .set("Authorization", adminAuth)
      .send();

    const after = await request(testApp).get(`/api/brands/${brand.id}/products`);
    expect(after.body.data.products.map((p: { id: string }) => p.id)).toContain(product.id);
  });

  it("freezes a suspended brand's own reads and writes without touching its staff's account", async () => {
    const brand = await createBrand();
    const owner = await createBrandOwner(brand.id);
    const ownerAuth = authHeaderFor(owner.id, UserRole.BRAND_OWNER);

    const before = await request(testApp).get("/api/brands/me").set("Authorization", ownerAuth);
    expect(before.status).toBe(200);

    await request(testApp)
      .post(`/api/platform/brands/${brand.id}/suspend`)
      .set("Authorization", adminAuth)
      .send({ reason: "Under review" });

    const duringGet = await request(testApp).get("/api/brands/me").set("Authorization", ownerAuth);
    expect(duringGet.status).toBe(403);
    expect(duringGet.body.code).toBe("BRAND_SUSPENDED");

    const ownerRow = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
    expect(ownerRow.accountStatus).toBe("ACTIVE");

    await request(testApp)
      .post(`/api/platform/brands/${brand.id}/unsuspend`)
      .set("Authorization", adminAuth)
      .send();

    const afterGet = await request(testApp).get("/api/brands/me").set("Authorization", ownerAuth);
    expect(afterGet.status).toBe(200);
  });

  it("is a safe no-op conflict when suspending an already-suspended brand", async () => {
    const brand = await createBrand();

    await request(testApp)
      .post(`/api/platform/brands/${brand.id}/suspend`)
      .set("Authorization", adminAuth)
      .send({ reason: "First" });

    const second = await request(testApp)
      .post(`/api/platform/brands/${brand.id}/suspend`)
      .set("Authorization", adminAuth)
      .send({ reason: "Second" });

    expect(second.status).toBe(409);
    expect(second.body.code).toBe("ALREADY_SUSPENDED");
  });

  it("rejects unsuspending a brand that isn't suspended", async () => {
    const brand = await createBrand();

    const res = await request(testApp)
      .post(`/api/platform/brands/${brand.id}/unsuspend`)
      .set("Authorization", adminAuth)
      .send();

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("NOT_SUSPENDED");
  });
});
