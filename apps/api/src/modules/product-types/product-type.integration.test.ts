import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { redis } from "#redis/redis.client.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

beforeEach(async () => {
  await redis.flushdb();
});

const createUser = async (role: UserRole = UserRole.CUSTOMER) =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Type Tester",
      handle: `type-tester-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const adminAuthHeader = async () => {
  const admin = await createUser(UserRole.ADMIN);
  await ensurePlatformOrganizationExists();
  await crmAccessService.grantPlatformStaffMembership(admin.id);
  return authHeaderFor(admin.id, UserRole.ADMIN);
};

const createProductType = async (
  slug: string,
  overrides: { label?: string; sortOrder?: number; isActive?: boolean } = {},
) =>
  prisma.productType.create({
    data: {
      slug,
      label: overrides.label ?? slug,
      sortOrder: overrides.sortOrder ?? 0,
      isActive: overrides.isActive ?? true,
    },
  });

const addSizeOption = (productTypeId: string, label: string) =>
  prisma.sizeOption.create({ data: { productTypeId, label } });

describe("POST /api/product-types", () => {
  it("creates a garment type as an admin", async () => {
    const response = await request(testApp)
      .post("/api/product-types")
      .set("Authorization", await adminAuthHeader())
      .send({ label: "Shoes", slug: `shoes-${randomUUID().slice(0, 6)}` });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ label: "Shoes", isActive: true, productCount: 0 });
  });

  it("rejects a duplicate slug", async () => {
    const slug = `dup-${randomUUID().slice(0, 6)}`;
    await createProductType(slug);

    const response = await request(testApp)
      .post("/api/product-types")
      .set("Authorization", await adminAuthHeader())
      .send({ label: "Copy", slug });

    expect(response.status).toBe(409);
  });

  it("rejects an invalid slug", async () => {
    const response = await request(testApp)
      .post("/api/product-types")
      .set("Authorization", await adminAuthHeader())
      .send({ label: "Bad", slug: "Not Valid!" });

    expect(response.status).toBe(422);
  });

  it("rejects a non-admin caller", async () => {
    const customer = await createUser(UserRole.CUSTOMER);

    const response = await request(testApp)
      .post("/api/product-types")
      .set("Authorization", authHeaderFor(customer.id, UserRole.CUSTOMER))
      .send({ label: "Blocked", slug: `blocked-${randomUUID().slice(0, 6)}` });

    expect(response.status).toBe(403);
  });
});

describe("PATCH /api/product-types/:id", () => {
  it("switches a garment type off", async () => {
    const productType = await createProductType(`toggle-${randomUUID().slice(0, 6)}`);

    const response = await request(testApp)
      .patch(`/api/product-types/${productType.id}`)
      .set("Authorization", await adminAuthHeader())
      .send({ isActive: false });

    expect(response.status).toBe(200);
    expect(response.body.data.isActive).toBe(false);
  });
});

describe("POST /api/product-types/reorder", () => {
  it("writes sortOrder from the position of each id", async () => {
    const authHeader = await adminAuthHeader();
    const first = await createProductType(`ra-${randomUUID().slice(0, 6)}`, { sortOrder: 0 });
    const second = await createProductType(`rb-${randomUUID().slice(0, 6)}`, { sortOrder: 1 });

    const response = await request(testApp)
      .post("/api/product-types/reorder")
      .set("Authorization", authHeader)
      .send({ orderedIds: [second.id, first.id] });

    expect(response.status).toBe(200);
    const stored = await prisma.productType.findMany({
      where: { id: { in: [first.id, second.id] } },
      orderBy: { sortOrder: "asc" },
      select: { id: true },
    });
    expect(stored.map((row) => row.id)).toEqual([second.id, first.id]);
  });

  it("rejects a duplicate id", async () => {
    const productType = await createProductType(`rd-${randomUUID().slice(0, 6)}`);

    const response = await request(testApp)
      .post("/api/product-types/reorder")
      .set("Authorization", await adminAuthHeader())
      .send({ orderedIds: [productType.id, productType.id] });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("INVALID_ORDER");
  });

  it("rejects an unknown id", async () => {
    const response = await request(testApp)
      .post("/api/product-types/reorder")
      .set("Authorization", await adminAuthHeader())
      .send({ orderedIds: [randomUUID()] });

    expect(response.status).toBe(422);
  });
});

describe("GET /api/product-types", () => {
  it("returns only active types on the storefront, ordered by sortOrder", async () => {
    await createProductType(`sf-b-${randomUUID().slice(0, 6)}`, { label: "Bee", sortOrder: 2 });
    await createProductType(`sf-a-${randomUUID().slice(0, 6)}`, { label: "Ay", sortOrder: 1 });
    await createProductType(`sf-off-${randomUUID().slice(0, 6)}`, {
      label: "Off",
      sortOrder: 0,
      isActive: false,
    });

    const response = await request(testApp).get("/api/product-types");

    expect(response.status).toBe(200);
    const labels = response.body.data.map((productType: { label: string }) => productType.label);
    expect(labels).toEqual(["Ay", "Bee"]);
  });

  it("returns inactive types on the admin list", async () => {
    await createProductType(`admin-off-${randomUUID().slice(0, 6)}`, { isActive: false });

    const response = await request(testApp)
      .get("/api/product-types/admin")
      .set("Authorization", await adminAuthHeader());

    expect(response.status).toBe(200);
    expect(
      response.body.data.some((productType: { isActive: boolean }) => !productType.isActive),
    ).toBe(true);
  });
});

describe("GET /api/product-types/assignable", () => {
  it("only lists active types that already have at least one size option", async () => {
    const withSizes = await createProductType(`asg-yes-${randomUUID().slice(0, 6)}`, {
      label: "Has sizes",
    });
    await addSizeOption(withSizes.id, "One size");
    await createProductType(`asg-no-${randomUUID().slice(0, 6)}`, { label: "No sizes" });
    const inactiveWithSizes = await createProductType(`asg-off-${randomUUID().slice(0, 6)}`, {
      label: "Off but sized",
      isActive: false,
    });
    await addSizeOption(inactiveWithSizes.id, "One size");

    const brandOwner = await createUser(UserRole.BRAND_OWNER);
    const response = await request(testApp)
      .get("/api/product-types/assignable")
      .set("Authorization", authHeaderFor(brandOwner.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(200);
    const labels = response.body.data.map((productType: { label: string }) => productType.label);
    expect(labels).toEqual(["Has sizes"]);
  });
});
