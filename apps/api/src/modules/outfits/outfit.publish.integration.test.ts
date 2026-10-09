import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { CreatorStatus, NotificationType } from "#generated/prisma/enums.js";
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
} from "#test/integration/outfitFixtures.js";
import { testApp } from "#test/integration/testApp.js";

import { notifyOutfitActivity } from "./outfit.notifications.js";

const LOOK_IMAGE_URL = "https://cdn.outfiqe.test/looks/dashain.jpg";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await seedOutfitSlotTypes();
});

const makeApprovedCreator = async (user: OutfitTestUser): Promise<OutfitTestUser> => {
  await prisma.user.update({
    where: { id: user.id },
    data: { isCreator: true, creatorStatus: CreatorStatus.APPROVED },
  });
  return user;
};

const writeAtCurrentVersion = async (
  caller: OutfitTestUser,
  method: "put" | "post",
  outfitId: string,
  path: string,
  body?: Record<string, unknown>,
) => writeToBuild(caller, method, `/${outfitId}${path}`, await currentBuildVersion(outfitId), body);

const lockedBuild = async (owner: OutfitTestUser) => {
  const outfitId = await startBuildOrFail(owner);
  const shirt = await createOutfitProduct("tops", { price: 3_200 });
  const trousers = await createOutfitProduct("bottoms", { price: 1_200 });
  await writeAtCurrentVersion(owner, "put", outfitId, "/slots/top/positions/0", {
    productId: shirt.id,
  });
  await writeAtCurrentVersion(owner, "put", outfitId, "/slots/bottom/positions/0", {
    productId: trousers.id,
  });
  await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
  const locked = await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
  expect(locked.status).toBe(HTTP_STATUS.OK);
  return { outfitId, shirt, trousers };
};

const lookBody = (sizesWorn: { productId: string; sizeWorn: string }[]) => ({
  imageUrls: [LOOK_IMAGE_URL],
  caption: "Dashain look",
  sizesWorn,
});

const postLook = (caller: OutfitTestUser, outfitId: string, body: Record<string, unknown>) =>
  request(testApp)
    .post(`/api/outfits/${outfitId}/look`)
    .set("Authorization", caller.auth)
    .send(body);

const readMyLook = (caller: OutfitTestUser, outfitId: string) =>
  request(testApp).get(`/api/outfits/${outfitId}/look`).set("Authorization", caller.auth);

describe("posting a build as a Creator Look", () => {
  it("posts the locked version, tagged with every item, and returns the same look when repeated", async () => {
    const owner = await makeApprovedCreator(await createOutfitUser("Sita"));
    const { outfitId, shirt, trousers } = await lockedBuild(owner);
    const body = lookBody([
      { productId: shirt.id, sizeWorn: "M" },
      { productId: trousers.id, sizeWorn: "M" },
    ]);

    const first = await postLook(owner, outfitId, body);
    const repeated = await postLook(owner, outfitId, body);

    expect(first.status).toBe(HTTP_STATUS.CREATED);
    expect(repeated.status).toBe(HTTP_STATUS.OK);
    expect(repeated.body.data.id).toBe(first.body.data.id);
    const look = await prisma.creatorLook.findUniqueOrThrow({
      where: { id: first.body.data.id },
      include: { taggedProducts: true },
    });
    expect(look.sourceOutfitId).toBe(outfitId);
    expect(look.caption).toBe("Dashain look");
    expect(look.taggedProducts.map(({ productId }) => productId).sort()).toEqual(
      [shirt.id, trousers.id].sort(),
    );
  });

  it("needs a locked build, a size for every item, a member and an approved creator", async () => {
    const owner = await makeApprovedCreator(await createOutfitUser("Sita"));
    const outsider = await makeApprovedCreator(await createOutfitUser("Hari"));
    const shopper = await createOutfitUser("Gita");
    const { outfitId, shirt, trousers } = await lockedBuild(owner);
    const shopperBuild = await lockedBuild(shopper);
    const fullSizes = lookBody([
      { productId: shirt.id, sizeWorn: "M" },
      { productId: trousers.id, sizeWorn: "M" },
    ]);
    const shopperSizes = lookBody([
      { productId: shopperBuild.shirt.id, sizeWorn: "M" },
      { productId: shopperBuild.trousers.id, sizeWorn: "M" },
    ]);

    const missingSize = await postLook(
      owner,
      outfitId,
      lookBody([{ productId: shirt.id, sizeWorn: "M" }]),
    );
    const asOutsider = await postLook(outsider, outfitId, fullSizes);
    const asShopper = await postLook(shopper, shopperBuild.outfitId, shopperSizes);

    expect(missingSize.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(missingSize.body.code).toBe("SIZES_WORN_MISMATCH");
    expect(asOutsider.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(asShopper.status).toBe(HTTP_STATUS.FORBIDDEN);

    await writeAtCurrentVersion(owner, "post", outfitId, "/unlock");
    const whileUnlocked = await postLook(owner, outfitId, fullSizes);
    expect(whileUnlocked.status).toBe(HTTP_STATUS.CONFLICT);
    expect(whileUnlocked.body.code).toBe("OUTFIT_NOT_LOCKED");
  });

  it("tells creators when a newer version is locked, and lets them post it", async () => {
    const owner = await createOutfitUser("Sita");
    const creator = await makeApprovedCreator(await createOutfitUser("Ram"));
    const { outfitId, shirt, trousers } = await lockedBuild(owner);
    await writeAtCurrentVersion(owner, "post", outfitId, "/unlock");
    await writeAtCurrentVersion(owner, "post", outfitId, "/members", { userIds: [creator.id] });
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(creator, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
    const sizes = [
      { productId: shirt.id, sizeWorn: "M" },
      { productId: trousers.id, sizeWorn: "M" },
    ];
    const firstLook = await postLook(creator, outfitId, lookBody(sizes));
    expect((await readMyLook(creator, outfitId)).body.data).toMatchObject({
      lookId: firstLook.body.data.id,
      isOutdated: false,
    });

    await writeAtCurrentVersion(owner, "post", outfitId, "/unlock");
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(creator, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
    const lockEvents = await prisma.outboxEvent.findMany({
      where: { topic: OUTBOX_TOPIC.OUTFIT_ACTIVITY, aggregateId: outfitId },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    for (const { id, aggregateId, payload } of lockEvents) {
      await notifyOutfitActivity({ outboxEventId: id, aggregateId, payload });
    }

    expect((await readMyLook(creator, outfitId)).body.data.isOutdated).toBe(true);
    expect(
      await prisma.notification.count({
        where: {
          recipientId: creator.id,
          type: NotificationType.OUTFIT_NEW_VERSION_AVAILABLE,
          entityId: outfitId,
        },
      }),
    ).toBe(1);

    const secondLook = await postLook(creator, outfitId, lookBody(sizes));
    expect(secondLook.status).toBe(HTTP_STATUS.CREATED);
    expect(secondLook.body.data.id).not.toBe(firstLook.body.data.id);
    expect((await readMyLook(creator, outfitId)).body.data).toMatchObject({
      lookId: secondLook.body.data.id,
      isOutdated: false,
    });
  });

  it("returns nothing for a member who hasn't posted it", async () => {
    const owner = await makeApprovedCreator(await createOutfitUser("Sita"));
    const { outfitId } = await lockedBuild(owner);

    const response = await readMyLook(owner, outfitId);

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data).toBeNull();
  });
});
