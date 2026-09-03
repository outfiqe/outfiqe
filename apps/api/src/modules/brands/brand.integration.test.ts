import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BrandRole, FollowTargetType, ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { brandRepository } from "#modules/brands/brand.repository.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const createUser = async (name: string, handle: string, role: UserRole = UserRole.CUSTOMER) =>
  prisma.user.create({
    data: {
      email: `${handle}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${handle}-${randomUUID().slice(0, 6)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const createBrand = async (name: string, overrides: { followerCount?: number } = {}) =>
  prisma.brand.create({
    data: {
      name,
      contactName: "Contact Person",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
      ...overrides,
    },
  });

const createBrandOwner = async (brandId: string, name: string, handle: string) => {
  const owner = await createUser(name, handle, UserRole.BRAND_OWNER);
  await prisma.brandMembership.create({
    data: { userId: owner.id, brandId, role: BrandRole.OWNER },
  });
  return owner;
};

const createApprovedProductForBrand = async (brandId: string, name: string) =>
  prisma.product.create({
    data: {
      brandId,
      name,
      price: 1000,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
      imageUrl: `https://cdn.outfiqe.test/${randomUUID()}.jpg`,
    },
  });

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

describe("GET /api/brands", () => {
  it("returns brands ordered by follower count with a total count", async () => {
    const popular = await createBrand("Popular Label", { followerCount: 50 });
    await createBrand("Quiet Label", { followerCount: 1 });

    const response = await request(testApp).get("/api/brands");

    expect(response.status).toBe(200);
    expect(response.body.data.brands[0].id).toBe(popular.id);
    expect(response.body.data).toHaveProperty("total");
    expect(response.body.data.total).toBeGreaterThanOrEqual(2);
  });

  it("paginates using nextCursor", async () => {
    const tag = randomUUID().slice(0, 8);
    await createBrand(`Pager ${tag} A`, { followerCount: 10 });
    await createBrand(`Pager ${tag} B`, { followerCount: 5 });

    const first = await request(testApp).get("/api/brands").query({ limit: 1 });

    expect(first.status).toBe(200);
    expect(first.body.data.brands).toHaveLength(1);
    expect(first.body.data.nextCursor).not.toBeNull();

    const second = await request(testApp)
      .get("/api/brands")
      .query({ limit: 1, cursor: first.body.data.nextCursor });

    expect(second.status).toBe(200);
    expect(second.body.data.brands).toHaveLength(1);
    expect(second.body.data.brands[0].id).not.toBe(first.body.data.brands[0].id);
  });

  it("marks isFollowing for an authenticated viewer, and leaves it false for others", async () => {
    const followed = await createBrand("Followed Label");
    const unfollowed = await createBrand("Unfollowed Label");
    const viewer = await createUser("Viewer", "brand-list-viewer");
    await prisma.follow.create({
      data: {
        followerId: viewer.id,
        followingType: FollowTargetType.BRAND,
        followingId: followed.id,
      },
    });

    const response = await request(testApp)
      .get("/api/brands")
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    const byId = new Map(
      response.body.data.brands.map((brand: { id: string; isFollowing: boolean }) => [
        brand.id,
        brand.isFollowing,
      ]),
    );
    expect(byId.get(followed.id)).toBe(true);
    expect(byId.get(unfollowed.id)).toBe(false);
  });

  it("defaults isFollowing to false for an anonymous caller", async () => {
    await createBrand("Anon View Label");

    const response = await request(testApp).get("/api/brands");

    expect(response.status).toBe(200);
    expect(
      response.body.data.brands.every(
        (brand: { isFollowing: boolean }) => brand.isFollowing === false,
      ),
    ).toBe(true);
  });

  it("includes each brand's approved product count", async () => {
    const brand = await createBrand("Counted Label");
    await createApprovedProductForBrand(brand.id, "Approved Piece");
    await prisma.product.create({
      data: {
        brandId: brand.id,
        name: "Pending Piece",
        price: 500,
        productTypeId: await ensureProductType(),
        status: ProductStatus.PENDING,
      },
    });

    const response = await request(testApp).get("/api/brands");

    const entry = response.body.data.brands.find((row: { id: string }) => row.id === brand.id);
    expect(entry.productCount).toBe(1);
  });

  it("returns brands matching a case-insensitive name search", async () => {
    const nike = await createBrand(`Nike Sportswear ${randomUUID()}`);
    await createBrand(`Adidas Originals ${randomUUID()}`);

    const response = await request(testApp).get("/api/brands").query({ q: "nike sportswear" });

    expect(response.status).toBe(200);
    const ids = response.body.data.brands.map((brand: { id: string }) => brand.id);
    expect(ids).toContain(nike.id);
    expect(ids).toHaveLength(1);
  });

  it("returns an empty list for a search with no matches", async () => {
    const response = await request(testApp)
      .get("/api/brands")
      .query({ q: `zzznonexistentbrandzzz-${randomUUID()}` });

    expect(response.status).toBe(200);
    expect(response.body.data.brands).toEqual([]);
  });

  it("ignores the search filter when q is omitted", async () => {
    await createBrand(`Unfiltered Brand ${randomUUID()}`);

    const response = await request(testApp).get("/api/brands").query({ limit: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data.brands.length).toBeGreaterThan(0);
  });
});

describe("GET /api/brands/me", () => {
  it("returns the caller's own brand profile", async () => {
    const brand = await createBrand("Own Brand");
    const owner = await createBrandOwner(brand.id, "Owner Person", "own-brand-owner");

    const response = await request(testApp)
      .get("/api/brands/me")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(200);
    expect(response.body.data.brand.id).toBe(brand.id);
    expect(response.body.data.membershipRole).toBe(BrandRole.OWNER);
  });

  it("requires authentication", async () => {
    const response = await request(testApp).get("/api/brands/me");

    expect(response.status).toBe(401);
  });

  it("rejects a caller who isn't a brand owner", async () => {
    const customer = await createUser("Plain Customer", "plain-customer-me");

    const response = await request(testApp)
      .get("/api/brands/me")
      .set("Authorization", authHeaderFor(customer.id, UserRole.CUSTOMER));

    expect(response.status).toBe(403);
  });

  it("returns 404 when the caller has no linked brand", async () => {
    const orphanOwner = await createUser("Orphan Owner", "orphan-owner");

    const response = await request(testApp)
      .get("/api/brands/me")
      .set("Authorization", authHeaderFor(orphanOwner.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/brands/me", () => {
  it("updates the caller's brand profile", async () => {
    const brand = await createBrand("Updatable Brand");
    const owner = await createBrandOwner(brand.id, "Updating Owner", "updating-owner");

    const response = await request(testApp)
      .patch("/api/brands/me")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({ contactName: "New Contact", instagram: "@newhandle" });

    expect(response.status).toBe(200);
    expect(response.body.data.brand).toMatchObject({
      contactName: "New Contact",
      instagram: "@newhandle",
    });

    const stored = await prisma.brand.findUniqueOrThrow({ where: { id: brand.id } });
    expect(stored.contactName).toBe("New Contact");
  });

  it("allows a partial update touching only one field", async () => {
    const brand = await createBrand("Partially Updatable Brand");
    const owner = await createBrandOwner(brand.id, "Partial Owner", "partial-owner");

    const response = await request(testApp)
      .patch("/api/brands/me")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({ bannerUrl: "https://cdn.outfiqe.test/new-banner.jpg" });

    expect(response.status).toBe(200);
    expect(response.body.data.brand.bannerUrl).toBe("https://cdn.outfiqe.test/new-banner.jpg");
    expect(response.body.data.brand.contactName).toBe("Contact Person");
  });

  it("rejects an invalid phone number", async () => {
    const brand = await createBrand("Invalid Phone Brand");
    const owner = await createBrandOwner(brand.id, "Invalid Phone Owner", "invalid-phone-owner");

    const response = await request(testApp)
      .patch("/api/brands/me")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send({ phone: "not-a-phone" });

    expect(response.status).toBe(422);
  });

  it("requires authentication", async () => {
    const response = await request(testApp).patch("/api/brands/me").send({ contactName: "X" });

    expect(response.status).toBe(401);
  });

  it("rejects a caller who isn't a brand owner", async () => {
    const customer = await createUser("Plain Customer", "plain-customer-patch");

    const response = await request(testApp)
      .patch("/api/brands/me")
      .set("Authorization", authHeaderFor(customer.id, UserRole.CUSTOMER))
      .send({ contactName: "X" });

    expect(response.status).toBe(403);
  });

  it("returns 404 when the caller has no linked brand", async () => {
    const orphanOwner = await createUser("Orphan Owner Two", "orphan-owner-two");

    const response = await request(testApp)
      .patch("/api/brands/me")
      .set("Authorization", authHeaderFor(orphanOwner.id, UserRole.BRAND_OWNER))
      .send({ contactName: "New Name" });

    expect(response.status).toBe(404);
  });
});

describe("GET /api/brands/:id", () => {
  it("returns a brand's public profile", async () => {
    const brand = await createBrand("Public Profile Brand");

    const response = await request(testApp).get(`/api/brands/${brand.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: brand.id,
      name: brand.name,
      isFollowing: false,
    });
  });

  it("exposes the brand owner's user id as contactUserId for messaging", async () => {
    const brand = await createBrand("Contact Profile Brand");
    const owner = await createBrandOwner(brand.id, "Contact Owner", "contact-owner");

    const response = await request(testApp).get(`/api/brands/${brand.id}`);

    expect(response.body.data.contactUserId).toBe(owner.id);
  });

  it("returns a null contactUserId for a brand with no owner membership yet", async () => {
    const brand = await createBrand("Ownerless Profile Brand");

    const response = await request(testApp).get(`/api/brands/${brand.id}`);

    expect(response.body.data.contactUserId).toBeNull();
  });

  it("reflects isFollowing true for a viewer who follows this brand", async () => {
    const brand = await createBrand("Followed Profile Brand");
    const viewer = await createUser("Following Viewer", "following-viewer");
    await prisma.follow.create({
      data: { followerId: viewer.id, followingType: FollowTargetType.BRAND, followingId: brand.id },
    });

    const response = await request(testApp)
      .get(`/api/brands/${brand.id}`)
      .set("Authorization", authHeaderFor(viewer.id));

    expect(response.status).toBe(200);
    expect(response.body.data.isFollowing).toBe(true);
  });

  it("returns 404 for a brand that doesn't exist", async () => {
    const response = await request(testApp).get(`/api/brands/${randomUUID()}`);

    expect(response.status).toBe(404);
  });

  it("rejects a malformed id", async () => {
    const response = await request(testApp).get("/api/brands/not-a-uuid");

    expect(response.status).toBe(422);
  });
});

describe("GET /api/brands/:id/products", () => {
  it("returns only that brand's approved products", async () => {
    const brand = await createBrand("Product Listing Brand");
    const approved = await createApprovedProductForBrand(brand.id, "Listed Approved Piece");
    await prisma.product.create({
      data: {
        brandId: brand.id,
        name: "Listed Pending Piece",
        price: 500,
        productTypeId: await ensureProductType(),
        status: ProductStatus.PENDING,
      },
    });
    const otherBrand = await createBrand("Other Listing Brand");
    await createApprovedProductForBrand(otherBrand.id, "Other Brand Piece");

    const response = await request(testApp).get(`/api/brands/${brand.id}/products`);

    expect(response.status).toBe(200);
    expect(response.body.data.products).toHaveLength(1);
    expect(response.body.data.products[0].id).toBe(approved.id);
  });

  it("returns an empty page for a brand with no approved products", async () => {
    const brand = await createBrand("Empty Listing Brand");

    const response = await request(testApp).get(`/api/brands/${brand.id}/products`);

    expect(response.status).toBe(200);
    expect(response.body.data.products).toEqual([]);
  });

  it("rejects a malformed brand id", async () => {
    const response = await request(testApp).get("/api/brands/not-a-uuid/products");

    expect(response.status).toBe(422);
  });
});

describe("brandRepository.findManyByIds", () => {
  it("returns an empty array without querying when given no ids", async () => {
    const brands = await brandRepository.findManyByIds([]);

    expect(brands).toEqual([]);
  });

  it("returns the matching brands for the given ids", async () => {
    const first = await createBrand("Lookup Brand One");
    const second = await createBrand("Lookup Brand Two");

    const brands = await brandRepository.findManyByIds([first.id, second.id]);

    expect(brands.map((brand) => brand.id).sort()).toEqual([first.id, second.id].sort());
  });

  it("filters by name when a query string is given", async () => {
    const matching = await createBrand(`Filterable Denim ${randomUUID().slice(0, 8)}`);
    const nonMatching = await createBrand(`Filterable Silk ${randomUUID().slice(0, 8)}`);

    const brands = await brandRepository.findManyByIds([matching.id, nonMatching.id], "denim");

    expect(brands).toHaveLength(1);
    expect(brands[0]?.id).toBe(matching.id);
  });
});
