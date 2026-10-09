import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createOutfitUser, type OutfitTestUser } from "#test/integration/outfitFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const MY_SIZES_PATH = "/api/saved-sizes/me";
const UNIT_PRICE = 2_000;

type SavedSizeRow = {
  productTypeId: string;
  savedSize: string | null;
  lastBoughtSize: string | null;
  sizeOptions: string[];
};

const createProductTypeWithSizes = async (sizeLabels: string[]) =>
  prisma.productType.create({
    data: {
      slug: `type-${randomUUID().slice(0, 8)}`,
      label: "Kurta",
      sizeOptions: {
        create: sizeLabels.map((label, sortOrder) => ({ label, sortOrder })),
      },
    },
  });

const buySize = async (
  buyer: OutfitTestUser,
  productTypeId: string,
  sizeLabel: string,
  {
    paymentStatus = PaymentStatus.PAID,
    fulfilmentStatus = FulfilmentStatus.DELIVERED,
  }: { paymentStatus?: PaymentStatus; fulfilmentStatus?: FulfilmentStatus } = {},
) => {
  const brand = await prisma.brand.create({
    data: {
      name: `Size Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Kurta",
      price: UNIT_PRICE,
      productTypeId,
      status: ProductStatus.APPROVED,
      sizes: { create: [{ label: sizeLabel, stock: 5 }] },
    },
    include: { sizes: true },
  });
  const [boughtSize] = product.sizes;
  if (!boughtSize) throw new Error("The product fixture has no size");
  await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: buyer.name,
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: UNIT_PRICE,
      deliveryFee: 0,
      total: UNIT_PRICE,
      paymentStatus,
      fulfilmentStatus,
      items: {
        create: [
          {
            productId: product.id,
            sizeId: boughtSize.id,
            qty: 1,
            unitPrice: UNIT_PRICE,
            listUnitPrice: UNIT_PRICE,
          },
        ],
      },
    },
  });
};

const readMySizes = async (caller: OutfitTestUser): Promise<SavedSizeRow[]> => {
  const response = await request(testApp).get(MY_SIZES_PATH).set("Authorization", caller.auth);
  expect(response.status).toBe(HTTP_STATUS.OK);
  return response.body.data;
};

const findRow = (rows: SavedSizeRow[], productTypeId: string) =>
  rows.find((row) => row.productTypeId === productTypeId);

beforeEach(async () => {
  await redis.flushdb();
});

describe("saved sizes", () => {
  it("lists every kind of clothing with its size options and no saved size at first", async () => {
    const shopper = await createOutfitUser("Sita");
    const kurta = await createProductTypeWithSizes(["S", "M", "L"]);

    expect(findRow(await readMySizes(shopper), kurta.id)).toEqual({
      productTypeId: kurta.id,
      productTypeSlug: kurta.slug,
      productTypeLabel: "Kurta",
      sizeOptions: ["S", "M", "L"],
      savedSize: null,
      lastBoughtSize: null,
    });
  });

  it("offers the size last bought, skipping cancelled and failed orders", async () => {
    const shopper = await createOutfitUser("Sita");
    const kurta = await createProductTypeWithSizes(["S", "M", "L"]);
    await buySize(shopper, kurta.id, "S");
    await buySize(shopper, kurta.id, "M");
    await buySize(shopper, kurta.id, "L", { fulfilmentStatus: FulfilmentStatus.CANCELLED });
    await buySize(shopper, kurta.id, "L", { paymentStatus: PaymentStatus.FAILED });

    expect(findRow(await readMySizes(shopper), kurta.id)?.lastBoughtSize).toBe("M");
  });

  it("saves, changes and removes a size, only for the person saving it", async () => {
    const shopper = await createOutfitUser("Sita");
    const otherShopper = await createOutfitUser("Ram");
    const kurta = await createProductTypeWithSizes(["S", "M", "L"]);
    const sizePath = `${MY_SIZES_PATH}/${kurta.id}`;

    await request(testApp)
      .put(sizePath)
      .set("Authorization", shopper.auth)
      .send({ sizeLabel: "S" });
    const changed = await request(testApp)
      .put(sizePath)
      .set("Authorization", shopper.auth)
      .send({ sizeLabel: "L" });

    expect(changed.status).toBe(HTTP_STATUS.OK);
    expect(findRow(changed.body.data, kurta.id)?.savedSize).toBe("L");
    expect(findRow(await readMySizes(otherShopper), kurta.id)?.savedSize).toBeNull();

    const removed = await request(testApp).delete(sizePath).set("Authorization", shopper.auth);
    expect(findRow(removed.body.data, kurta.id)?.savedSize).toBeNull();
  });

  it("refuses a size that kind of clothing doesn't come in", async () => {
    const shopper = await createOutfitUser("Sita");
    const kurta = await createProductTypeWithSizes(["S", "M"]);

    const response = await request(testApp)
      .put(`${MY_SIZES_PATH}/${kurta.id}`)
      .set("Authorization", shopper.auth)
      .send({ sizeLabel: "XXL" });

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.code).toBe("UNKNOWN_SIZE");
  });

  it("needs a signed-in person", async () => {
    const response = await request(testApp).get(MY_SIZES_PATH);

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });
});
