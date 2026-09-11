import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandRole,
  FulfilmentStatus,
  OrderFulfilmentSummary,
  PaymentMethod,
  PlatformFeeType,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const OK = 200;
const CREATED = 201;
const UNPROCESSABLE = 422;
const FORBIDDEN = 403;
const NOT_FOUND = 404;
const CONFLICT = 409;

beforeEach(async () => {
  await redis.flushdb();
});

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createUser = async (role: UserRole) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `bf-${suffix}@outfiqe.test`,
      name: role === UserRole.CUSTOMER ? "Buyer Person" : "Brand Person",
      handle: `bf-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
};

const createBrandWithOwner = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Fulfilment Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const owner = await createUser(UserRole.BRAND_OWNER);
  await prisma.brandMembership.create({
    data: { userId: owner.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  return { brand, owner };
};

const createProduct = async (brandId: string, price: number) => {
  const product = await prisma.product.create({
    data: {
      brandId,
      name: "Fulfilment Jacket",
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 10 },
  });
  return { product, size };
};

const seedCommerceConfig = async (adminId: string) => {
  await prisma.platformCommissionRule.create({
    data: {
      isActive: true,
      updatedById: adminId,
      tiers: {
        create: [
          {
            minPrice: 0,
            maxPrice: null,
            feeType: PlatformFeeType.PERCENT,
            ratePercentBasisPoints: 1000,
            sortOrder: 0,
          },
        ],
      },
    },
  });
  await prisma.deliveryZone.create({
    data: {
      name: "Default Zone",
      isDefault: true,
      standardDeliveryFee: 100,
      freeDeliveryThreshold: 5000,
      codHandlingFee: 0,
    },
  });
};

const checkoutBuyNow = async (buyerId: string, productId: string, sizeId: string) => {
  const response = await request(testApp)
    .post("/api/orders/checkout")
    .set("Authorization", authHeaderFor(buyerId, UserRole.CUSTOMER))
    .send({
      fullName: "Buyer Person",
      phone: "9812345678",
      address: "42 Delivery Road",
      city: "Kathmandu",
      landmark: "Near the temple",
      paymentMethod: PaymentMethod.COD,
      buyNow: { productId, sizeId, qty: 2 },
    });
  expect(response.status).toBe(CREATED);
  return response.body.data.id as string;
};

const groupFor = (orderId: string, brandId: string) =>
  prisma.orderFulfilmentGroup.findFirstOrThrow({ where: { orderId, brandId } });

const getGroups = (ownerId: string, query: Record<string, string> = {}) =>
  request(testApp)
    .get("/api/orders/brand/fulfilment-groups")
    .query(query)
    .set("Authorization", authHeaderFor(ownerId, UserRole.BRAND_OWNER));

const getGroup = (ownerId: string, groupId: string) =>
  request(testApp)
    .get(`/api/orders/brand/fulfilment-groups/${groupId}`)
    .set("Authorization", authHeaderFor(ownerId, UserRole.BRAND_OWNER));

const patchGroup = (ownerId: string, groupId: string, body: Record<string, unknown>) =>
  request(testApp)
    .patch(`/api/orders/brand/fulfilment-groups/${groupId}`)
    .set("Authorization", authHeaderFor(ownerId, UserRole.BRAND_OWNER))
    .send(body);

describe("GET /api/orders/brand/fulfilment-groups", () => {
  it("returns only the caller brand's groups and honours the status filter", async () => {
    const { userId: adminId } = await createAdminSession();
    await seedCommerceConfig(adminId);
    const { brand, owner } = await createBrandWithOwner();
    const { brand: otherBrand } = await createBrandWithOwner();
    const mine = await createProduct(brand.id, 1000);
    const theirs = await createProduct(otherBrand.id, 1000);
    const buyer = await createUser(UserRole.CUSTOMER);

    await checkoutBuyNow(buyer.id, mine.product.id, mine.size.id);
    const buyerTwo = await createUser(UserRole.CUSTOMER);
    await checkoutBuyNow(buyerTwo.id, theirs.product.id, theirs.size.id);

    const all = await getGroups(owner.id);
    expect(all.status).toBe(OK);
    expect(all.body.data.items).toHaveLength(1);
    expect(all.body.data.items[0]).toMatchObject({
      status: FulfilmentStatus.PLACED,
      itemCount: 1,
      totalQty: 2,
      shipToCity: "Kathmandu",
    });

    const shipped = await getGroups(owner.id, { status: FulfilmentStatus.SHIPPED });
    expect(shipped.body.data.items).toHaveLength(0);
  });

  it("403s for a signed-in user whose role is not brand owner", async () => {
    const buyer = await createUser(UserRole.CUSTOMER);
    const response = await request(testApp)
      .get("/api/orders/brand/fulfilment-groups")
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER));
    expect(response.status).toBe(FORBIDDEN);
  });
});

describe("GET /api/orders/brand/fulfilment-groups/:groupId", () => {
  it("returns the brand-safe detail: own items, ship-to contact and this brand's payout", async () => {
    const { userId: adminId } = await createAdminSession();
    await seedCommerceConfig(adminId);
    const { brand, owner } = await createBrandWithOwner();
    const { product, size } = await createProduct(brand.id, 1000);
    const buyer = await createUser(UserRole.CUSTOMER);
    const orderId = await checkoutBuyNow(buyer.id, product.id, size.id);
    const group = await groupFor(orderId, brand.id);

    const response = await getGroup(owner.id, group.id);

    expect(response.status).toBe(OK);
    const detail = response.body.data;
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0]).toMatchObject({ qty: 2, unitPrice: 1000, listUnitPrice: 1000 });
    expect(detail.shipTo).toMatchObject({
      fullName: "Buyer Person",
      phone: "9812345678",
      address: "42 Delivery Road",
      city: "Kathmandu",
      landmark: "Near the temple",
    });
    expect(detail.payout).toMatchObject({ grossAmount: 2000, platformFee: 200, netAmount: 1800 });
    expect(detail.orderFulfilmentSummary).toBe(OrderFulfilmentSummary.UNFULFILLED);
  });

  it("404s for another brand's group and for an unknown id", async () => {
    const { userId: adminId } = await createAdminSession();
    await seedCommerceConfig(adminId);
    const { brand, owner } = await createBrandWithOwner();
    const { owner: otherOwner } = await createBrandWithOwner();
    const { product, size } = await createProduct(brand.id, 1000);
    const buyer = await createUser(UserRole.CUSTOMER);
    const orderId = await checkoutBuyNow(buyer.id, product.id, size.id);
    const group = await groupFor(orderId, brand.id);

    expect((await getGroup(otherOwner.id, group.id)).status).toBe(NOT_FOUND);
    expect((await getGroup(owner.id, randomUUID())).status).toBe(NOT_FOUND);
  });
});

describe("PATCH /api/orders/brand/fulfilment-groups/:groupId", () => {
  it("walks a group PLACED -> PACKED -> SHIPPED -> DELIVERED and rolls the order up", async () => {
    const { userId: adminId } = await createAdminSession();
    await seedCommerceConfig(adminId);
    const { brand, owner } = await createBrandWithOwner();
    const { product, size } = await createProduct(brand.id, 1000);
    const buyer = await createUser(UserRole.CUSTOMER);
    const orderId = await checkoutBuyNow(buyer.id, product.id, size.id);
    const group = await groupFor(orderId, brand.id);

    expect((await patchGroup(owner.id, group.id, { status: FulfilmentStatus.PACKED })).status).toBe(
      OK,
    );

    const noTracking = await patchGroup(owner.id, group.id, { status: FulfilmentStatus.SHIPPED });
    expect(noTracking.status).toBe(UNPROCESSABLE);

    const shipped = await patchGroup(owner.id, group.id, {
      status: FulfilmentStatus.SHIPPED,
      carrier: "Pathao",
      trackingNumber: "PA-99881",
    });
    expect(shipped.status).toBe(OK);
    expect(shipped.body.data).toMatchObject({
      status: FulfilmentStatus.SHIPPED,
      carrier: "Pathao",
      trackingNumber: "PA-99881",
    });

    const orderAfterShip = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(orderAfterShip.fulfilmentSummary).toBe(OrderFulfilmentSummary.SHIPPED);
    expect(orderAfterShip.deliveredAt).toBeNull();

    expect(
      (await patchGroup(owner.id, group.id, { status: FulfilmentStatus.DELIVERED })).status,
    ).toBe(OK);
    const orderAfterDelivery = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(orderAfterDelivery.fulfilmentSummary).toBe(OrderFulfilmentSummary.FULFILLED);
    expect(orderAfterDelivery.fulfilmentStatus).toBe(FulfilmentStatus.DELIVERED);
    expect(orderAfterDelivery.deliveredAt).not.toBeNull();
  });

  it("stamps order.deliveredAt only once every shipment is delivered on a multi-brand order", async () => {
    const { userId: adminId } = await createAdminSession();
    await seedCommerceConfig(adminId);
    const { brand: brandA, owner: ownerA } = await createBrandWithOwner();
    const { brand: brandB, owner: ownerB } = await createBrandWithOwner();
    const a = await createProduct(brandA.id, 1000);
    const b = await createProduct(brandB.id, 1000);
    const buyer = await createUser(UserRole.CUSTOMER);

    const cart = await prisma.cart.create({ data: { userId: buyer.id } });
    await prisma.cartItem.createMany({
      data: [
        { cartId: cart.id, productId: a.product.id, sizeId: a.size.id, qty: 1 },
        { cartId: cart.id, productId: b.product.id, sizeId: b.size.id, qty: 1 },
      ],
    });
    const checkout = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .send({
        fullName: "Buyer Person",
        phone: "9812345678",
        address: "42 Delivery Road",
        city: "Kathmandu",
        paymentMethod: PaymentMethod.COD,
      });
    expect(checkout.status).toBe(CREATED);
    const orderId = checkout.body.data.id as string;

    const groupA = await groupFor(orderId, brandA.id);
    const groupB = await groupFor(orderId, brandB.id);

    const deliver = async (ownerId: string, groupId: string) => {
      await patchGroup(ownerId, groupId, { status: FulfilmentStatus.PACKED });
      await patchGroup(ownerId, groupId, {
        status: FulfilmentStatus.SHIPPED,
        carrier: "Pathao",
        trackingNumber: `PA-${groupId.slice(0, 6)}`,
      });
      await patchGroup(ownerId, groupId, { status: FulfilmentStatus.DELIVERED });
    };

    await deliver(ownerA.id, groupA.id);
    const afterFirst = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(afterFirst.fulfilmentSummary).toBe(OrderFulfilmentSummary.PARTIALLY_SHIPPED);
    expect(afterFirst.deliveredAt).toBeNull();

    await deliver(ownerB.id, groupB.id);
    const afterBoth = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(afterBoth.fulfilmentSummary).toBe(OrderFulfilmentSummary.FULFILLED);
    expect(afterBoth.deliveredAt).not.toBeNull();
  });

  it("rejects skipping a step and rejects touching another brand's group", async () => {
    const { userId: adminId } = await createAdminSession();
    await seedCommerceConfig(adminId);
    const { brand, owner } = await createBrandWithOwner();
    const { owner: otherOwner } = await createBrandWithOwner();
    const { product, size } = await createProduct(brand.id, 1000);
    const buyer = await createUser(UserRole.CUSTOMER);
    const orderId = await checkoutBuyNow(buyer.id, product.id, size.id);
    const group = await groupFor(orderId, brand.id);

    const skip = await patchGroup(owner.id, group.id, {
      status: FulfilmentStatus.SHIPPED,
      carrier: "Pathao",
      trackingNumber: "PA-1",
    });
    expect(skip.status).toBe(CONFLICT);

    const foreign = await patchGroup(otherOwner.id, group.id, { status: FulfilmentStatus.PACKED });
    expect(foreign.status).toBe(NOT_FOUND);
  });
});

describe("POST /api/orders/brand/fulfilment-groups/:groupId/request-cancellation", () => {
  const requestCancellation = (ownerId: string, groupId: string, reason: string) =>
    request(testApp)
      .post(`/api/orders/brand/fulfilment-groups/${groupId}/request-cancellation`)
      .set("Authorization", authHeaderFor(ownerId, UserRole.BRAND_OWNER))
      .send({ reason });

  it("flags the group once and rejects a second request", async () => {
    const { userId: adminId } = await createAdminSession();
    await seedCommerceConfig(adminId);
    const { brand, owner } = await createBrandWithOwner();
    const { product, size } = await createProduct(brand.id, 1000);
    const buyer = await createUser(UserRole.CUSTOMER);
    const orderId = await checkoutBuyNow(buyer.id, product.id, size.id);
    const group = await groupFor(orderId, brand.id);

    const first = await requestCancellation(owner.id, group.id, "Out of stock after all");
    expect(first.status).toBe(OK);

    const flagged = await prisma.orderFulfilmentGroup.findUniqueOrThrow({
      where: { id: group.id },
    });
    expect(flagged.cancellationRequestedAt).not.toBeNull();
    expect(flagged.cancellationReason).toBe("Out of stock after all");

    const second = await requestCancellation(owner.id, group.id, "Still out of stock");
    expect(second.status).toBe(CONFLICT);
  });
});
