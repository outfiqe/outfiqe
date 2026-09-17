import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BrandRole, ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const createUser = async (role: UserRole) =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Test User",
      handle: `user-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const createBrand = () =>
  prisma.brand.create({
    data: {
      name: `Thrift Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
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

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createCategory = () =>
  prisma.category.create({
    data: { slug: `thrift-cat-${randomUUID().slice(0, 8)}`, name: "Thrift Test Category" },
  });

const createSizeOption = async () => {
  const productTypeId = await ensureProductType();
  return prisma.sizeOption.create({
    data: { productTypeId, label: `M-${randomUUID().slice(0, 4)}`, sortOrder: 0 },
  });
};

type SeedProductOptions = {
  isThrift?: boolean;
  stock?: number;
  status?: ProductStatus;
};

const seedApprovedProduct = async (
  brandId: string,
  categoryId: string,
  { isThrift = false, stock = 1, status = ProductStatus.APPROVED }: SeedProductOptions = {},
) => {
  const productTypeId = await ensureProductType();
  return prisma.product.create({
    data: {
      brandId,
      name: `Thrift Fixture ${randomUUID().slice(0, 6)}`,
      price: 1_000,
      productTypeId,
      status,
      isThrift,
      thriftConditionRating: isThrift ? "GOOD" : null,
      thriftConditionNotes: isThrift ? "Gently worn, no visible flaws." : null,
      categories: { connect: { id: categoryId } },
      sizes: { create: [{ label: "M", stock, inStock: stock > 0, sortOrder: 0 }] },
    },
  });
};

const setUpBrandFixtures = async () => {
  const brand = await createBrand();
  const owner = await createBrandOwner(brand.id);
  const category = await createCategory();
  const sizeOption = await createSizeOption();
  return { brand, owner, category, sizeOption };
};

const buildCreateBody = (
  categorySlug: string,
  sizeOptionId: string,
  overrides: Record<string, unknown> = {},
) => ({
  name: "Secondhand Trench Coat",
  price: 3_500,
  type: "tops",
  categories: [categorySlug],
  sizes: [{ sizeOptionId, stock: 1 }],
  ...overrides,
});

describe("POST /api/products — thrift condition validation", () => {
  it("rejects a thrift listing with no condition rating or notes", async () => {
    const { owner, category, sizeOption } = await setUpBrandFixtures();

    const response = await request(testApp)
      .post("/api/products")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send(buildCreateBody(category.slug, sizeOption.id, { isThrift: true }));

    expect(response.status).toBe(422);
  });

  it("accepts a thrift listing with a condition rating and notes", async () => {
    const { owner, category, sizeOption } = await setUpBrandFixtures();

    const response = await request(testApp)
      .post("/api/products")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send(
        buildCreateBody(category.slug, sizeOption.id, {
          isThrift: true,
          thriftConditionRating: "GOOD",
          thriftConditionNotes: "Small mark on the left cuff, otherwise excellent.",
        }),
      );

    expect(response.status).toBe(201);
    expect(response.body.data.isThrift).toBe(true);

    const stored = await prisma.product.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    expect(stored.thriftConditionRating).toBe("GOOD");
    expect(stored.thriftConditionNotes).toContain("left cuff");
  });

  it("doesn't require condition fields for an ordinary, non-thrift listing", async () => {
    const { owner, category, sizeOption } = await setUpBrandFixtures();

    const response = await request(testApp)
      .post("/api/products")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send(buildCreateBody(category.slug, sizeOption.id));

    expect(response.status).toBe(201);
    expect(response.body.data.isThrift).toBe(false);
  });
});

describe("PATCH /api/products/:id — unchecking thrift", () => {
  it("clears the condition fields once isThrift is unset", async () => {
    const { owner, category, sizeOption } = await setUpBrandFixtures();

    const created = await request(testApp)
      .post("/api/products")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send(
        buildCreateBody(category.slug, sizeOption.id, {
          isThrift: true,
          thriftConditionRating: "FAIR",
          thriftConditionNotes: "Visible fading on the front panel.",
        }),
      );
    expect(created.status).toBe(201);

    const response = await request(testApp)
      .patch(`/api/products/${created.body.data.id}`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({
        name: "Secondhand Trench Coat",
        price: 3_500,
        type: "tops",
        categories: [category.slug],
        isThrift: false,
      });

    expect(response.status).toBe(200);
    const stored = await prisma.product.findUniqueOrThrow({
      where: { id: created.body.data.id },
    });
    expect(stored.isThrift).toBe(false);
    expect(stored.thriftConditionRating).toBeNull();
    expect(stored.thriftConditionNotes).toBeNull();
  });
});

describe("GET /api/products — thrift filter and sold-out exclusion", () => {
  it("returns only thrift products when thrift=true", async () => {
    const brand = await createBrand();
    const category = await createCategory();
    const thriftProduct = await seedApprovedProduct(brand.id, category.id, { isThrift: true });
    await seedApprovedProduct(brand.id, category.id, { isThrift: false });

    const response = await request(testApp).get(
      `/api/products?category=${category.slug}&thrift=true`,
    );

    expect(response.status).toBe(200);
    const ids = response.body.data.products.map((product: { id: string }) => product.id);
    expect(ids).toContain(thriftProduct.id);
    expect(ids).toHaveLength(1);
  });

  it("excludes a sold-out thrift product from the public browse", async () => {
    const brand = await createBrand();
    const category = await createCategory();
    const soldOutThrift = await seedApprovedProduct(brand.id, category.id, {
      isThrift: true,
      stock: 0,
    });
    const inStockThrift = await seedApprovedProduct(brand.id, category.id, {
      isThrift: true,
      stock: 1,
    });

    const response = await request(testApp).get(`/api/products?category=${category.slug}`);

    const ids = response.body.data.products.map((product: { id: string }) => product.id);
    expect(ids).toContain(inStockThrift.id);
    expect(ids).not.toContain(soldOutThrift.id);
  });

  it("never excludes a non-thrift product at zero stock", async () => {
    const brand = await createBrand();
    const category = await createCategory();
    const outOfStockRestockable = await seedApprovedProduct(brand.id, category.id, {
      isThrift: false,
      stock: 0,
    });

    const response = await request(testApp).get(`/api/products?category=${category.slug}`);

    const ids = response.body.data.products.map((product: { id: string }) => product.id);
    expect(ids).toContain(outOfStockRestockable.id);
  });
});

describe("GET /api/products/:id — a sold-out thrift product stays reachable", () => {
  it("still resolves and reports isSoldOut instead of 404ing", async () => {
    const brand = await createBrand();
    const category = await createCategory();
    const soldOutThrift = await seedApprovedProduct(brand.id, category.id, {
      isThrift: true,
      stock: 0,
    });

    const response = await request(testApp).get(`/api/products/${soldOutThrift.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data.isSoldOut).toBe(true);
  });
});

describe("GET /api/products/mine — a brand still sees its own sold-out thrift listing", () => {
  it("keeps a sold-out thrift product in the owning brand's own list", async () => {
    const { owner, category, sizeOption } = await setUpBrandFixtures();
    const created = await request(testApp)
      .post("/api/products")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send(
        buildCreateBody(category.slug, sizeOption.id, {
          isThrift: true,
          thriftConditionRating: "LIKE_NEW",
          thriftConditionNotes: "Worn once.",
        }),
      );
    expect(created.status).toBe(201);
    await prisma.productSize.updateMany({
      where: { productId: created.body.data.id },
      data: { stock: 0 },
    });

    const response = await request(testApp)
      .get("/api/products/mine")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER));

    const listed = response.body.data.products.find(
      (candidate: { id: string }) => candidate.id === created.body.data.id,
    );
    expect(listed).toBeDefined();
    expect(listed.isSoldOut).toBe(true);
  });
});
