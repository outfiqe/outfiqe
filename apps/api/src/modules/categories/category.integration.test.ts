import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CategoryStatus, ProductStatus, ProductType, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { categoryService } from "#modules/categories/category.service.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { redis } from "#redis/redis.client.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const CATEGORIES_CACHE_KEY = "cache:categories:all";

beforeEach(async () => {
  await redis.flushdb();
});

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createUser = async (role: UserRole = UserRole.CUSTOMER) =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Category Tester",
      handle: `category-tester-${randomUUID().slice(0, 8)}`,
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

const createCategory = async (
  name: string,
  overrides: { status?: CategoryStatus; sortOrder?: number; slug?: string } = {},
) =>
  prisma.category.create({
    data: {
      name,
      slug:
        overrides.slug ??
        `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${randomUUID().slice(0, 6)}`,
      status: overrides.status ?? CategoryStatus.PUBLISHED,
      sortOrder: overrides.sortOrder ?? 0,
    },
  });

const waitForCacheKey = async (key: string, attempts = 20): Promise<string | null> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const value = await redis.get(key);
    if (value !== null) return value;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return null;
};

describe("POST /api/categories", () => {
  it("creates a category as an admin", async () => {
    const response = await request(testApp)
      .post("/api/categories")
      .set("Authorization", await adminAuthHeader())
      .send({ name: "Footwear", slug: `footwear-${randomUUID().slice(0, 6)}` });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ name: "Footwear", productCount: 0 });
  });

  it("rejects a duplicate slug", async () => {
    const slug = `duplicate-${randomUUID().slice(0, 6)}`;
    await createCategory("Original", { slug });

    const response = await request(testApp)
      .post("/api/categories")
      .set("Authorization", await adminAuthHeader())
      .send({ name: "Copycat", slug });

    expect(response.status).toBe(409);
  });

  it("rejects an invalid slug", async () => {
    const response = await request(testApp)
      .post("/api/categories")
      .set("Authorization", await adminAuthHeader())
      .send({ name: "Bad Slug", slug: "Not A Valid Slug!" });

    expect(response.status).toBe(422);
  });

  it("requires authentication", async () => {
    const response = await request(testApp)
      .post("/api/categories")
      .send({ name: "No Auth", slug: `no-auth-${randomUUID().slice(0, 6)}` });

    expect(response.status).toBe(401);
  });

  it("rejects a non-admin caller", async () => {
    const customer = await createUser(UserRole.CUSTOMER);

    const response = await request(testApp)
      .post("/api/categories")
      .set("Authorization", authHeaderFor(customer.id, UserRole.CUSTOMER))
      .send({ name: "Blocked", slug: `blocked-${randomUUID().slice(0, 6)}` });

    expect(response.status).toBe(403);
  });

  it("refreshes the public categories cache on a successful create", async () => {
    const response = await request(testApp)
      .post("/api/categories")
      .set("Authorization", await adminAuthHeader())
      .send({ name: "Cache Refreshed", slug: `cache-refreshed-${randomUUID().slice(0, 6)}` });

    expect(response.status).toBe(201);

    const cached = await waitForCacheKey(CATEGORIES_CACHE_KEY);
    expect(cached).not.toBeNull();
    const parsed = JSON.parse(cached as string) as { name: string }[];
    expect(parsed.some((category) => category.name === "Cache Refreshed")).toBe(true);
  });
});

describe("PATCH /api/categories/:id", () => {
  it("updates a category", async () => {
    const category = await createCategory("Updatable");

    const response = await request(testApp)
      .patch(`/api/categories/${category.id}`)
      .set("Authorization", await adminAuthHeader())
      .send({ name: "Updated Name", sortOrder: 5 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ name: "Updated Name", sortOrder: 5 });

    const stored = await prisma.category.findUniqueOrThrow({ where: { id: category.id } });
    expect(stored.name).toBe("Updated Name");
  });

  it("returns 404 for a category that doesn't exist", async () => {
    const response = await request(testApp)
      .patch(`/api/categories/${randomUUID()}`)
      .set("Authorization", await adminAuthHeader())
      .send({ name: "Ghost" });

    expect(response.status).toBe(404);
  });

  it("rejects renaming to a slug already taken by another category", async () => {
    const takenSlug = `taken-${randomUUID().slice(0, 6)}`;
    await createCategory("Slug Holder", { slug: takenSlug });
    const category = await createCategory("Slug Seeker");

    const response = await request(testApp)
      .patch(`/api/categories/${category.id}`)
      .set("Authorization", await adminAuthHeader())
      .send({ slug: takenSlug });

    expect(response.status).toBe(409);
  });

  it("rejects a malformed id", async () => {
    const response = await request(testApp)
      .patch("/api/categories/not-a-uuid")
      .set("Authorization", await adminAuthHeader())
      .send({ name: "Whatever" });

    expect(response.status).toBe(422);
  });

  it("requires authentication", async () => {
    const category = await createCategory("Auth Required");

    const response = await request(testApp)
      .patch(`/api/categories/${category.id}`)
      .send({ name: "Whatever" });

    expect(response.status).toBe(401);
  });

  it("rejects a non-admin caller", async () => {
    const category = await createCategory("Blocked Update");
    const customer = await createUser(UserRole.CUSTOMER);

    const response = await request(testApp)
      .patch(`/api/categories/${category.id}`)
      .set("Authorization", authHeaderFor(customer.id, UserRole.CUSTOMER))
      .send({ name: "Whatever" });

    expect(response.status).toBe(403);
  });
});

describe("GET /api/categories/admin", () => {
  it("lists every category regardless of status", async () => {
    await createCategory("Published One", { status: CategoryStatus.PUBLISHED });
    await createCategory("Draft One", { status: CategoryStatus.DRAFT });

    const response = await request(testApp)
      .get("/api/categories/admin")
      .set("Authorization", await adminAuthHeader());

    expect(response.status).toBe(200);
    const names = response.body.data.map((category: { name: string }) => category.name);
    expect(names).toEqual(expect.arrayContaining(["Published One", "Draft One"]));
  });

  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/categories/admin");

    expect(response.status).toBe(401);
  });

  it("rejects a non-admin caller", async () => {
    const customer = await createUser(UserRole.CUSTOMER);

    const response = await request(testApp)
      .get("/api/categories/admin")
      .set("Authorization", authHeaderFor(customer.id, UserRole.CUSTOMER));

    expect(response.status).toBe(403);
  });
});

describe("GET /api/categories", () => {
  it("returns only published categories, ordered by sortOrder", async () => {
    await createCategory("Second", { status: CategoryStatus.PUBLISHED, sortOrder: 2 });
    await createCategory("First", { status: CategoryStatus.PUBLISHED, sortOrder: 1 });
    await createCategory("Hidden Draft", { status: CategoryStatus.DRAFT, sortOrder: 0 });

    const response = await request(testApp).get("/api/categories");

    expect(response.status).toBe(200);
    const names = response.body.data.map((category: { name: string }) => category.name);
    expect(names).toEqual(["First", "Second"]);
  });

  it("includes each category's approved product count", async () => {
    const category = await createCategory("Counted Category");
    const brand = await prisma.brand.create({
      data: {
        name: "Counted Brand",
        contactName: "Contact",
        email: `${randomUUID()}@brand.outfiqe.test`,
        phone: uniquePhone(),
        instagram: `@${randomUUID().slice(0, 8)}`,
      },
    });
    await prisma.product.create({
      data: {
        brandId: brand.id,
        name: "Counted Product",
        price: 1000,
        type: ProductType.TOPS,
        status: ProductStatus.APPROVED,
        categories: { connect: { id: category.id } },
      },
    });

    const response = await request(testApp).get("/api/categories");

    const entry = response.body.data.find((row: { id: string }) => row.id === category.id);
    expect(entry.productCount).toBe(1);
  });

  it("serves a cached response on a cache hit instead of hitting the database", async () => {
    const sentinelData = [
      {
        id: randomUUID(),
        slug: "cached-only",
        name: "Cached Only",
        imageUrl: null,
        productCount: 99,
      },
    ];
    await redis.set(CATEGORIES_CACHE_KEY, JSON.stringify(sentinelData), "EX", 300);
    await createCategory("Not In Cache", { status: CategoryStatus.PUBLISHED });

    const response = await request(testApp).get("/api/categories");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: "Categories.", data: sentinelData });
  });

  it("populates the cache on a miss so the next read can hit it", async () => {
    await createCategory("Freshly Cached", { status: CategoryStatus.PUBLISHED });

    const first = await request(testApp).get("/api/categories");
    expect(first.status).toBe(200);

    const cached = await waitForCacheKey(CATEGORIES_CACHE_KEY);
    expect(cached).not.toBeNull();
    const parsed = JSON.parse(cached as string) as { name: string }[];
    expect(parsed.some((category) => category.name === "Freshly Cached")).toBe(true);
  });

  it("keeps the cache shape identical whether populated by a read-miss or a write-refresh", async () => {
    await createCategory("Read Populated", { status: CategoryStatus.PUBLISHED });
    const readMiss = await request(testApp).get("/api/categories");
    expect(readMiss.status).toBe(200);
    const afterRead = await waitForCacheKey(CATEGORIES_CACHE_KEY);
    expect(afterRead).not.toBeNull();

    await request(testApp)
      .post("/api/categories")
      .set("Authorization", await adminAuthHeader())
      .send({ name: "Write Populated", slug: `write-populated-${randomUUID().slice(0, 6)}` });
    const afterWrite = await waitForCacheKey(CATEGORIES_CACHE_KEY);
    expect(afterWrite).not.toBeNull();

    expect(Array.isArray(JSON.parse(afterRead as string))).toBe(true);
    expect(Array.isArray(JSON.parse(afterWrite as string))).toBe(true);

    const secondRead = await request(testApp).get("/api/categories");
    expect(secondRead.status).toBe(200);
    expect(secondRead.body).toMatchObject({ success: true, message: "Categories." });
    expect(Array.isArray(secondRead.body.data)).toBe(true);
  });
});

describe("categoryService.getBySlug", () => {
  it("returns the category for a known slug", async () => {
    const category = await createCategory("Slug Lookup");

    const found = await categoryService.getBySlug(category.slug);

    expect(found.id).toBe(category.id);
  });

  it("throws for an unknown slug", async () => {
    await expect(categoryService.getBySlug(`missing-${randomUUID()}`)).rejects.toMatchObject({
      code: "CATEGORY_NOT_FOUND",
    });
  });
});

describe("categoryService.getManyBySlugs", () => {
  it("returns all categories matching the given slugs", async () => {
    const first = await createCategory("Many Lookup One");
    const second = await createCategory("Many Lookup Two");

    const found = await categoryService.getManyBySlugs([first.slug, second.slug]);

    expect(found.map((category) => category.id).sort()).toEqual([first.id, second.id].sort());
  });

  it("throws when one or more slugs don't match a category", async () => {
    const known = await createCategory("Known Only");

    await expect(
      categoryService.getManyBySlugs([known.slug, `missing-${randomUUID()}`]),
    ).rejects.toMatchObject({ code: "CATEGORY_NOT_FOUND" });
  });
});
