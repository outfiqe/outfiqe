import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { ATTRIBUTION_WINDOW_MS } from "#constants/commerce.constants.js";
import { prisma } from "#db/prisma.js";
import { CreatorLinkType } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import {
  authHeaderFor,
  checkoutRequest,
  createActiveCommissionRule,
  createBuyer,
  createDefaultDeliveryZone,
  createPurchasableProduct,
} from "#test/integration/coupon-fixtures.js";
import { createCreator } from "#test/integration/creator-look-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
});

const MS_PER_MINUTE = 60_000;

const prepare = async () => {
  await createDefaultDeliveryZone();
  const { userId: adminId } = await createAdminSession();
  await createActiveCommissionRule(adminId);
  await prisma.commissionTier.create({ data: { minPrice: 0, maxPrice: null, amount: 75 } });
  const creator = await createCreator("Attributed Creator", "attributed");
  const link = await prisma.creatorLink.create({
    data: {
      creatorId: creator.id,
      type: CreatorLinkType.EXTERNAL_REUSABLE,
      token: randomUUID().replace(/-/g, ""),
    },
  });
  const purchasable = await createPurchasableProduct(2_000);
  return { creator, link, ...purchasable };
};

const recordAnonymousClick = (token: string, sessionId: string) =>
  request(testApp).post(`/api/creator-links/${token}/click`).send({ sessionId });

const buyWithSession = async (
  buyer: { id: string },
  purchasable: { product: { id: string }; size: { id: string } },
  sessionId: string,
) => {
  await request(testApp)
    .post("/api/cart/items")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({ productId: purchasable.product.id, sizeId: purchasable.size.id, qty: 1 });
  return checkoutRequest(buyer, { sessionId });
};

const countCommissionsFor = (creatorId: string) =>
  prisma.creatorCommission.count({ where: { creatorId } });

describe("creator link attribution through a client-supplied session id", () => {
  it("pays the creator when a visitor clicks their link and then buys the product", async () => {
    const { creator, link, ...purchasable } = await prepare();
    const sessionId = randomUUID();
    await recordAnonymousClick(link.token, sessionId);
    const buyer = await createBuyer();

    const checkout = await buyWithSession(buyer, purchasable, sessionId);

    expect(checkout.status).toBe(201);
    expect(await countCommissionsFor(creator.id)).toBe(1);
  });

  it("does not pay a creator for buying through their own link", async () => {
    const { creator, link, ...purchasable } = await prepare();
    const sessionId = randomUUID();
    await recordAnonymousClick(link.token, sessionId);

    const checkout = await buyWithSession(creator, purchasable, sessionId);

    expect(checkout.status).toBe(201);
    expect(await countCommissionsFor(creator.id)).toBe(0);
  });

  it("does not pay for a click older than the attribution window", async () => {
    const { creator, link, ...purchasable } = await prepare();
    const sessionId = randomUUID();
    await prisma.creatorLinkClick.create({
      data: {
        linkId: link.id,
        sessionId,
        createdAt: new Date(Date.now() - ATTRIBUTION_WINDOW_MS - MS_PER_MINUTE),
      },
    });
    const buyer = await createBuyer();

    await buyWithSession(buyer, purchasable, sessionId);

    expect(await countCommissionsFor(creator.id)).toBe(0);
  });

  it("lets a buyer claim clicks that another signed-in user already owns", async () => {
    const { creator, link, ...purchasable } = await prepare();
    const sessionId = randomUUID();
    const firstVisitor = await createBuyer();
    await request(testApp)
      .post(`/api/creator-links/${link.token}/click`)
      .set("Authorization", authHeaderFor(firstVisitor.id))
      .send({ sessionId });
    const otherBuyer = await createBuyer();

    await buyWithSession(otherBuyer, purchasable, sessionId);

    expect(await countCommissionsFor(creator.id)).toBe(0);
  });

  it("does not let one buyer claim the same session's clicks after another buyer already did", async () => {
    const { creator, link, ...purchasable } = await prepare();
    const sessionId = randomUUID();
    await recordAnonymousClick(link.token, sessionId);
    const firstBuyer = await createBuyer();
    const secondBuyer = await createBuyer();

    await buyWithSession(firstBuyer, purchasable, sessionId);
    await buyWithSession(secondBuyer, purchasable, sessionId);

    expect(await countCommissionsFor(creator.id)).toBe(1);
  });
});
