import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandRole,
  CommissionScope,
  CommissionSource,
  FeatureFlagRollout,
  PaymentMethod,
  PlatformFeeType,
  UserRole,
} from "#generated/prisma/enums.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import {
  createOutfitProduct,
  createOutfitUser,
  currentBuildVersion,
  type OutfitTestUser,
  seedOutfitSlotTypes,
  setFeatureFlagRollout,
  startBuildOrFail,
  turnOutfitBuilderOn,
  writeToBuild,
} from "#test/integration/outfitFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { BUILD_ITEM_LEFT_OUT_REASON } from "./outfit.constants.js";

const BUILD_COMMISSION_AMOUNT = 90;
const SOLD_OUT_STOCK = 0;

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await setFeatureFlagRollout("outfit_public_feed", FeatureFlagRollout.EVERYONE);
  await seedOutfitSlotTypes();
  await prisma.deliveryZone.create({
    data: {
      name: "Default Zone",
      isDefault: true,
      standardDeliveryFee: 100,
      freeDeliveryThreshold: 50_000,
      codHandlingFee: 0,
    },
  });
});

const writeAtCurrentVersion = async (
  caller: OutfitTestUser,
  method: "put" | "post" | "patch",
  outfitId: string,
  path: string,
  body?: Record<string, unknown>,
) => writeToBuild(caller, method, `/${outfitId}${path}`, await currentBuildVersion(outfitId), body);

const lockedBuild = async (owner: OutfitTestUser, editors: OutfitTestUser[] = []) => {
  const outfitId = await startBuildOrFail(owner);
  if (editors.length > 0) {
    const added = await writeAtCurrentVersion(owner, "post", outfitId, "/members", {
      userIds: editors.map(({ id }) => id),
    });
    expect(added.status).toBe(HTTP_STATUS.OK);
  }
  const shirt = await createOutfitProduct("tops", { price: 3_200 });
  const trousers = await createOutfitProduct("bottoms", { price: 1_200 });
  await writeAtCurrentVersion(owner, "put", outfitId, "/slots/top/positions/0", {
    productId: shirt.id,
  });
  await writeAtCurrentVersion(owner, "put", outfitId, "/slots/bottom/positions/0", {
    productId: trousers.id,
  });
  for (const member of [owner, ...editors]) {
    await writeAtCurrentVersion(member, "put", outfitId, "/happy", { isHappy: true });
  }
  const locked = await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
  expect(locked.status).toBe(HTTP_STATUS.OK);
  return { outfitId, shirt, trousers };
};

const makePublic = async (owner: OutfitTestUser, outfitId: string) => {
  const response = await writeAtCurrentVersion(owner, "put", outfitId, "/visibility", {
    visibility: "PUBLIC",
  });
  expect(response.status).toBe(HTTP_STATUS.OK);
};

const addBuildToCart = (
  caller: OutfitTestUser,
  outfitId: string,
  body: { isFullSet: boolean; sizes: { productId: string; sizeLabel: string }[] },
) =>
  request(testApp)
    .post(`/api/outfits/${outfitId}/cart`)
    .set("Authorization", caller.auth)
    .send(body);

const createBrandOwner = async (name: string) => {
  const brandOwner = await createOutfitUser(name, UserRole.BRAND_OWNER);
  const brand = await prisma.brand.create({
    data: {
      name: `${name}'s Brand`,
      contactName: name,
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  await prisma.brandMembership.create({
    data: { userId: brandOwner.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  return { brandOwner, brandId: brand.id };
};

const prepareCheckout = async () => {
  const { userId: adminId } = await createAdminSession();
  await prisma.platformCommissionRule.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
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
            ratePercentBasisPoints: 1_000,
            sortOrder: 0,
          },
        ],
      },
    },
  });
  await prisma.commissionTier.create({
    data: {
      scope: CommissionScope.OUTFIT_BUILD,
      minPrice: 0,
      maxPrice: null,
      amount: BUILD_COMMISSION_AMOUNT,
    },
  });
};

const checkOutCart = (caller: OutfitTestUser) =>
  request(testApp).post("/api/orders/checkout").set("Authorization", caller.auth).send({
    fullName: "Gita Shrestha",
    phone: "9800000000",
    address: "Jhamsikhel",
    city: "Lalitpur",
    paymentMethod: PaymentMethod.COD,
  });

describe("buying from a build", () => {
  it("adds the full set in the chosen sizes and names anything left out", async () => {
    const owner = await createOutfitUser("Sita");
    const { outfitId, shirt, trousers } = await lockedBuild(owner);
    await prisma.productSize.updateMany({
      where: { productId: trousers.id },
      data: { stock: SOLD_OUT_STOCK },
    });

    const response = await addBuildToCart(owner, outfitId, {
      isFullSet: true,
      sizes: [
        { productId: shirt.id, sizeLabel: "M" },
        { productId: trousers.id, sizeLabel: "M" },
      ],
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.addedProductIds).toEqual([shirt.id]);
    expect(response.body.data.leftOut).toEqual([
      { productId: trousers.id, reason: BUILD_ITEM_LEFT_OUT_REASON.SOLD_OUT },
    ]);
    const cartItems = await prisma.cartItem.findMany({ where: { cart: { userId: owner.id } } });
    expect(cartItems.map(({ productId }) => productId)).toEqual([shirt.id]);
    const visits = await prisma.outfitBuildVisit.findMany({ where: { userId: owner.id } });
    expect(
      visits.map(({ productId, outfitId: visitedOutfitId }) => [productId, visitedOutfitId]),
    ).toEqual([[shirt.id, outfitId]]);
  });

  it("adds only the picked items, and explains every one it couldn't add", async () => {
    const owner = await createOutfitUser("Sita");
    const { outfitId, shirt, trousers } = await lockedBuild(owner);
    const somethingElse = await createOutfitProduct("tops");

    const response = await addBuildToCart(owner, outfitId, {
      isFullSet: false,
      sizes: [
        { productId: shirt.id, sizeLabel: "XXL" },
        { productId: somethingElse.id, sizeLabel: "M" },
      ],
    });
    const fullSetWithoutSizes = await addBuildToCart(owner, outfitId, {
      isFullSet: true,
      sizes: [{ productId: shirt.id, sizeLabel: "M" }],
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.addedProductIds).toEqual([]);
    expect(response.body.data.leftOut).toEqual([
      { productId: shirt.id, reason: BUILD_ITEM_LEFT_OUT_REASON.SIZE_NOT_OFFERED },
      { productId: somethingElse.id, reason: BUILD_ITEM_LEFT_OUT_REASON.NOT_IN_BUILD },
    ]);
    expect(fullSetWithoutSizes.body.data.addedProductIds).toEqual([shirt.id]);
    expect(fullSetWithoutSizes.body.data.leftOut).toEqual([
      { productId: trousers.id, reason: BUILD_ITEM_LEFT_OUT_REASON.NO_SIZE_CHOSEN },
    ]);
  });

  it("hides a private build from shoppers who aren't on it, and keeps brand accounts out", async () => {
    const owner = await createOutfitUser("Sita");
    const outsider = await createOutfitUser("Hari");
    const { brandOwner } = await createBrandOwner("Bikash");
    const { outfitId, shirt } = await lockedBuild(owner);
    const body = { isFullSet: true, sizes: [{ productId: shirt.id, sizeLabel: "M" }] };

    const asOutsider = await addBuildToCart(outsider, outfitId, body);
    const asBrand = await addBuildToCart(brandOwner, outfitId, body);

    expect(asOutsider.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(asBrand.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});

describe("Build commission", () => {
  it("splits a sale from a public build equally between everyone on it, paying a brand's share to the brand", async () => {
    await prepareCheckout();
    const owner = await createOutfitUser("Sita");
    const editor = await createOutfitUser("Ram");
    const { brandOwner, brandId } = await createBrandOwner("Bikash");
    const buyer = await createOutfitUser("Gita");
    const { outfitId, shirt, trousers } = await lockedBuild(owner, [editor, brandOwner]);
    await makePublic(owner, outfitId);

    const added = await addBuildToCart(buyer, outfitId, {
      isFullSet: true,
      sizes: [
        { productId: shirt.id, sizeLabel: "M" },
        { productId: trousers.id, sizeLabel: "M" },
      ],
    });
    const checkout = await checkOutCart(buyer);

    expect(added.status).toBe(HTTP_STATUS.OK);
    expect(checkout.status).toBe(HTTP_STATUS.CREATED);
    const shirtLine = await prisma.orderItem.findFirstOrThrow({
      where: { orderId: checkout.body.data.id, productId: shirt.id },
      include: { commissions: true },
    });
    expect(shirtLine.attributionSource).toBe(CommissionSource.OUTFIT_BUILD);
    expect(shirtLine.attributedOutfitId).toBe(outfitId);
    expect(shirtLine.attributedCreatorId).toBeNull();
    const shares = shirtLine.commissions.map(({ creatorId, recipientBrandId, amount }) => ({
      recipient: creatorId ?? recipientBrandId,
      amount,
    }));
    expect(shares).toHaveLength(3);
    expect(shares).toEqual(
      expect.arrayContaining([
        { recipient: owner.id, amount: 30 },
        { recipient: editor.id, amount: 30 },
        { recipient: brandId, amount: 30 },
      ]),
    );
    expect(shirtLine.commissions.every(({ buildVisitId }) => buildVisitId !== null)).toBe(true);
  });

  it("pays nothing to a contributor buying from their own build, without growing anyone else's share", async () => {
    await prepareCheckout();
    const owner = await createOutfitUser("Sita");
    const editor = await createOutfitUser("Ram");
    const { outfitId, shirt } = await lockedBuild(owner, [editor]);

    await addBuildToCart(editor, outfitId, {
      isFullSet: false,
      sizes: [{ productId: shirt.id, sizeLabel: "M" }],
    });
    const checkout = await checkOutCart(editor);

    expect(checkout.status).toBe(HTTP_STATUS.CREATED);
    const commissions = await prisma.creatorCommission.findMany({
      where: { orderItem: { orderId: checkout.body.data.id } },
    });
    expect(commissions.map(({ creatorId, amount }) => ({ creatorId, amount }))).toEqual([
      { creatorId: owner.id, amount: BUILD_COMMISSION_AMOUNT / 2 },
    ]);
  });

  it("lets a contributor who isn't a creator see the build earnings they've made", async () => {
    await prepareCheckout();
    const owner = await createOutfitUser("Sita");
    const buyer = await createOutfitUser("Gita");
    const { outfitId, shirt } = await lockedBuild(owner);
    await makePublic(owner, outfitId);

    const beforeAnySale = await request(testApp)
      .get("/api/commissions/me/summary")
      .set("Authorization", owner.auth);
    const eligibilityBeforeSale = await request(testApp)
      .get("/api/commissions/me/eligibility")
      .set("Authorization", owner.auth);
    await addBuildToCart(buyer, outfitId, {
      isFullSet: false,
      sizes: [{ productId: shirt.id, sizeLabel: "M" }],
    });
    await checkOutCart(buyer);
    const afterSale = await request(testApp)
      .get("/api/commissions/me/summary")
      .set("Authorization", owner.auth);
    const eligibilityAfterSale = await request(testApp)
      .get("/api/commissions/me/eligibility")
      .set("Authorization", owner.auth);

    expect(beforeAnySale.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(eligibilityBeforeSale.body.data).toEqual({ canEarn: false });
    expect(afterSale.status).toBe(HTTP_STATUS.OK);
    expect(afterSale.body.data.pending).toBe(BUILD_COMMISSION_AMOUNT);
    expect(eligibilityAfterSale.body.data).toEqual({ canEarn: true });
  });
});
