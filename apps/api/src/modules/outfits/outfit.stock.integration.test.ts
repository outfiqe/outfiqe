import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { NotificationType, OutfitStatus } from "#generated/prisma/enums.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { redis } from "#redis/redis.client.js";
import {
  createOutfitProduct,
  createOutfitUser,
  currentBuildVersion,
  type OutfitTestUser,
  seedOutfitSlotTypes,
  startBuildOrFail,
  turnOutfitBuilderOn,
  writeToBuild,
} from "#test/integration/outfit-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { flagSoldOutBoardItems, notifyItemsSoldOut } from "./outfit.stock.js";

const SOLD_OUT_STOCK = 0;
const RESTOCKED_STOCK = 3;

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await seedOutfitSlotTypes();
});

const placeOrFail = async (
  caller: OutfitTestUser,
  outfitId: string,
  slotKey: string,
  productId: string,
) => {
  const response = await writeToBuild(
    caller,
    "put",
    `/${outfitId}/slots/${slotKey}/positions/0`,
    await currentBuildVersion(outfitId),
    { productId },
  );
  expect(response.status).toBe(HTTP_STATUS.OK);
};

const buildWithShirt = async (owner: OutfitTestUser) => {
  const outfitId = await startBuildOrFail(owner);
  const shirt = await createOutfitProduct("tops", { price: 3_200 });
  await placeOrFail(owner, outfitId, "top", shirt.id);
  const [shirtSize] = await prisma.productSize.findMany({ where: { productId: shirt.id } });
  if (!shirtSize) throw new Error("The shirt fixture has no size");
  return { outfitId, shirt, shirtSizeId: shirtSize.id };
};

const setStock = (sizeId: string, stock: number) =>
  prisma.productSize.update({ where: { id: sizeId }, data: { stock } });

const announceStockChange = (sizeIds: string[]) =>
  flagSoldOutBoardItems({
    outboxEventId: randomUUID(),
    aggregateId: randomUUID(),
    payload: { sizeIds },
  });

const outboxTopicsFor = async (outfitId: string) =>
  (
    await prisma.outboxEvent.findMany({
      where: {
        aggregateId: outfitId,
        topic: {
          in: [OUTBOX_TOPIC.OUTFIT_ITEMS_SOLD_OUT, OUTBOX_TOPIC.OUTFIT_AVAILABILITY_CHANGED],
        },
      },
      orderBy: { createdAt: "asc" },
    })
  ).map(({ topic }) => topic);

describe("sold-out alerts", () => {
  it("flags a sold-out item once, announces it, and clears the flag when it is back in stock", async () => {
    const owner = await createOutfitUser("Sita");
    const { outfitId, shirt, shirtSizeId } = await buildWithShirt(owner);

    await setStock(shirtSizeId, SOLD_OUT_STOCK);
    await announceStockChange([shirtSizeId]);
    await announceStockChange([shirtSizeId]);

    const flaggedItem = await prisma.outfitItem.findFirstOrThrow({
      where: { outfitId, productId: shirt.id },
    });
    expect(flaggedItem.soldOutAlertedAt).not.toBeNull();
    expect(await outboxTopicsFor(outfitId)).toEqual([
      OUTBOX_TOPIC.OUTFIT_ITEMS_SOLD_OUT,
      OUTBOX_TOPIC.OUTFIT_AVAILABILITY_CHANGED,
    ]);

    await setStock(shirtSizeId, RESTOCKED_STOCK);
    await announceStockChange([shirtSizeId]);

    const restockedItem = await prisma.outfitItem.findFirstOrThrow({
      where: { outfitId, productId: shirt.id },
    });
    expect(restockedItem.soldOutAlertedAt).toBeNull();
    expect(await outboxTopicsFor(outfitId)).toEqual([
      OUTBOX_TOPIC.OUTFIT_ITEMS_SOLD_OUT,
      OUTBOX_TOPIC.OUTFIT_AVAILABILITY_CHANGED,
      OUTBOX_TOPIC.OUTFIT_AVAILABILITY_CHANGED,
    ]);
  });

  it("leaves locked builds alone and ignores stock changes that don't sell anything out", async () => {
    const owner = await createOutfitUser("Sita");
    const { outfitId, shirtSizeId } = await buildWithShirt(owner);

    await announceStockChange([shirtSizeId]);
    expect(await outboxTopicsFor(outfitId)).toEqual([]);

    await prisma.outfit.update({ where: { id: outfitId }, data: { status: OutfitStatus.LOCKED } });
    await setStock(shirtSizeId, SOLD_OUT_STOCK);
    await announceStockChange([shirtSizeId]);
    expect(await outboxTopicsFor(outfitId)).toEqual([]);
  });

  it("tells the owner and every editor which item sold out", async () => {
    const owner = await createOutfitUser("Sita");
    const editor = await createOutfitUser("Ram");
    const { outfitId, shirt } = await buildWithShirt(owner);
    const added = await writeToBuild(
      owner,
      "post",
      `/${outfitId}/members`,
      await currentBuildVersion(outfitId),
      { userIds: [editor.id] },
    );
    expect(added.status).toBe(HTTP_STATUS.OK);

    await notifyItemsSoldOut({
      outboxEventId: randomUUID(),
      aggregateId: outfitId,
      payload: { outfitId, productIds: [shirt.id] },
    });

    const soldOutNotifications = await prisma.notification.findMany({
      where: { type: NotificationType.OUTFIT_ITEMS_SOLD_OUT, entityId: outfitId },
    });
    expect(soldOutNotifications.map(({ recipientId }) => recipientId).sort()).toEqual(
      [owner.id, editor.id].sort(),
    );
    expect(soldOutNotifications[0]?.metadata).toMatchObject({
      productName: shirt.name,
      soldOutItemCount: 1,
    });
  });
});

describe("GET /api/outfits/:id/slots/:slotKey/positions/:position/replacements", () => {
  const replacementsPath = (outfitId: string, slotKey: string, position: number) =>
    `/api/outfits/${outfitId}/slots/${slotKey}/positions/${position}/replacements`;

  it("suggests in-stock products of the same kind, same brand first then closest in price", async () => {
    const owner = await createOutfitUser("Sita");
    const { outfitId, shirt, shirtSizeId } = await buildWithShirt(owner);
    await setStock(shirtSizeId, SOLD_OUT_STOCK);
    const sameBrandShirt = await createOutfitProduct("tops", {
      price: 9_000,
      brandId: shirt.brandId,
    });
    const closePriceShirt = await createOutfitProduct("tops", { price: 3_100 });
    const farPriceShirt = await createOutfitProduct("tops", { price: 6_000 });
    await createOutfitProduct("tops", { price: 3_200, stock: SOLD_OUT_STOCK });
    await createOutfitProduct("bottoms", { price: 3_200 });

    const response = await request(testApp)
      .get(replacementsPath(outfitId, "top", 0))
      .set("Authorization", owner.auth);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.products.map((product: { id: string }) => product.id)).toEqual([
      sameBrandShirt.id,
      closePriceShirt.id,
      farPriceShirt.id,
    ]);
  });

  it("hides the build from people who aren't on it and 404s an empty place", async () => {
    const owner = await createOutfitUser("Sita");
    const outsider = await createOutfitUser("Hari");
    const { outfitId } = await buildWithShirt(owner);

    const asOutsider = await request(testApp)
      .get(replacementsPath(outfitId, "top", 0))
      .set("Authorization", outsider.auth);
    const emptyPlace = await request(testApp)
      .get(replacementsPath(outfitId, "bottom", 0))
      .set("Authorization", owner.auth);

    expect(asOutsider.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(emptyPlace.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(emptyPlace.body.code).toBe("ITEM_NOT_FOUND");
  });
});
