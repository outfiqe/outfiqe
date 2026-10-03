import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { ContentReportTarget, FeatureFlagRollout } from "#generated/prisma/enums.js";
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

const OK_STATUS = 200;
const CREATED_STATUS = 201;
const NO_CONTENT_STATUS = 204;
const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;
const REAL_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await setFeatureFlagRollout("outfit_public_feed", FeatureFlagRollout.EVERYONE);
  await seedOutfitSlotTypes();
});

const writeAtCurrentVersion = async (
  caller: OutfitTestUser,
  method: "put" | "post" | "patch",
  outfitId: string,
  path: string,
  body?: Record<string, unknown>,
) => writeToBuild(caller, method, `/${outfitId}${path}`, await currentBuildVersion(outfitId), body);

const lockedBuild = async (
  owner: OutfitTestUser,
  { title = "Dashain look", shirtPrice = 3_200, shirtStock = 5 } = {},
) => {
  const outfitId = await startBuildOrFail(owner);
  const shirt = await createOutfitProduct("tops", { price: shirtPrice, stock: shirtStock });
  const trousers = await createOutfitProduct("bottoms", { price: 1_200 });
  await writeAtCurrentVersion(owner, "patch", outfitId, "/settings", { title });
  await writeAtCurrentVersion(owner, "put", outfitId, "/slots/top/positions/0", {
    productId: shirt.id,
  });
  await writeAtCurrentVersion(owner, "put", outfitId, "/slots/bottom/positions/0", {
    productId: trousers.id,
  });
  await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
  await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
  return { outfitId, shirt, trousers };
};

const makePublic = async (owner: OutfitTestUser, outfitId: string) => {
  const response = await writeAtCurrentVersion(owner, "put", outfitId, "/visibility", {
    visibility: "PUBLIC",
  });
  expect(response.status).toBe(OK_STATUS);
};

const publicFeed = (query = "") => request(testApp).get(`/api/outfits/public${query}`);

describe("the public Builds feed", () => {
  it("lists public builds newest first with their contributors, totals and counts", async () => {
    const owner = await createOutfitUser("Sita");
    const first = await lockedBuild(owner, { title: "First" });
    const second = await lockedBuild(owner, { title: "Second" });
    await makePublic(owner, first.outfitId);
    await makePublic(owner, second.outfitId);
    await lockedBuild(owner, { title: "Still private" });

    const response = await publicFeed();

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.items.map(({ title }: { title: string }) => title)).toEqual([
      "Second",
      "First",
    ]);
    expect(response.body.data.items[0]).toMatchObject({
      itemCount: 2,
      total: 4_400,
      isFullyAvailable: true,
      likeCount: 0,
      isLiked: false,
      contributors: [{ id: owner.id, name: "Sita" }],
    });
  });

  it("filters by price and by everything being in stock, and pages with a cursor", async () => {
    const owner = await createOutfitUser("Sita");
    const cheap = await lockedBuild(owner, { title: "Cheap", shirtPrice: 1_000 });
    const pricey = await lockedBuild(owner, { title: "Pricey", shirtPrice: 9_000 });
    await makePublic(owner, cheap.outfitId);
    await makePublic(owner, pricey.outfitId);
    await prisma.productSize.updateMany({
      where: { productId: pricey.shirt.id },
      data: { stock: 0 },
    });

    const underFiveThousand = await publicFeed("?maxPrice=5000");
    const inStockOnly = await publicFeed("?inStockOnly=true");
    const firstPage = await publicFeed("?limit=1");
    const secondPage = await publicFeed(`?limit=1&cursor=${firstPage.body.data.nextCursor}`);

    expect(underFiveThousand.body.data.items.map(({ title }: { title: string }) => title)).toEqual([
      "Cheap",
    ]);
    expect(inStockOnly.body.data.items.map(({ title }: { title: string }) => title)).toEqual([
      "Cheap",
    ]);
    expect(firstPage.body.data.items.map(({ title }: { title: string }) => title)).toEqual([
      "Pricey",
    ]);
    expect(secondPage.body.data.items.map(({ title }: { title: string }) => title)).toEqual([
      "Cheap",
    ]);
    expect(secondPage.body.data.nextCursor).toBeNull();
  });

  it("shows a contributor's and a brand's public builds", async () => {
    const owner = await createOutfitUser("Sita");
    const other = await createOutfitUser("Ram");
    const { outfitId, shirt } = await lockedBuild(owner);
    await makePublic(owner, outfitId);
    const otherBuild = await lockedBuild(other, { title: "Ram's" });
    await makePublic(other, otherBuild.outfitId);

    const byContributor = await publicFeed(`?contributorId=${owner.id}`);
    const byBrand = await publicFeed(`?brandId=${shirt.brandId}`);

    expect(byContributor.body.data.items.map(({ id }: { id: string }) => id)).toEqual([outfitId]);
    expect(byBrand.body.data.items.map(({ id }: { id: string }) => id)).toEqual([outfitId]);
  });

  it("refuses to make a build public when its name breaks the content rules", async () => {
    const owner = await createOutfitUser("Sita");
    const { outfitId } = await lockedBuild(owner, { title: "call 9841234567" });

    const response = await writeAtCurrentVersion(owner, "put", outfitId, "/visibility", {
      visibility: "PUBLIC",
    });

    expect(response.status).toBe(UNPROCESSABLE_STATUS);
    expect(response.body.code).toBe("CONTENT_NOT_ALLOWED");
  });
});

describe("likes, saves and comments", () => {
  it("lets signed-in people like and save a public build once, and undo it", async () => {
    const owner = await createOutfitUser("Sita");
    const fan = await createOutfitUser("Gita");
    const { outfitId } = await lockedBuild(owner);
    await makePublic(owner, outfitId);
    const react = (method: "put" | "delete", path: string) =>
      request(testApp)[method](`/api/outfits/${outfitId}${path}`).set("Authorization", fan.auth);

    await react("put", "/like");
    const likedTwice = await react("put", "/like");
    await react("put", "/save");
    const saved = await request(testApp).get("/api/outfits/saved").set("Authorization", fan.auth);
    const unliked = await react("delete", "/like");

    expect(likedTwice.body.data).toEqual({ isLiked: true, likeCount: 1 });
    expect(saved.body.data.items.map(({ id }: { id: string }) => id)).toEqual([outfitId]);
    expect(saved.body.data.items[0]).toMatchObject({ isLiked: true, isSaved: true });
    expect(unliked.body.data).toEqual({ isLiked: false, likeCount: 0 });
  });

  it("threads replies under comments, keeps counts right, and checks the content", async () => {
    const owner = await createOutfitUser("Sita");
    const fan = await createOutfitUser("Gita");
    const { outfitId } = await lockedBuild(owner);
    await makePublic(owner, outfitId);
    const comment = (caller: OutfitTestUser, body: Record<string, unknown>) =>
      request(testApp)
        .post(`/api/outfits/${outfitId}/comments`)
        .set("Authorization", caller.auth)
        .send(body);

    const topLevel = await comment(fan, { body: "Love the kurta" });
    const reply = await comment(owner, {
      body: "Thank you!",
      parentCommentId: topLevel.body.data.id,
    });
    const replyToReply = await comment(fan, {
      body: "Welcome",
      parentCommentId: reply.body.data.id,
    });
    const spam = await comment(fan, { body: "cheaper at knockoffs.shop" });

    expect(topLevel.status).toBe(CREATED_STATUS);
    expect(replyToReply.status).toBe(UNPROCESSABLE_STATUS);
    expect(spam.body.code).toBe("CONTENT_NOT_ALLOWED");

    const comments = await request(testApp).get(`/api/outfits/${outfitId}/comments`);
    const replies = await request(testApp).get(
      `/api/outfits/${outfitId}/comments/${topLevel.body.data.id}/replies`,
    );
    expect(comments.body.data.items).toEqual([
      expect.objectContaining({ body: "Love the kurta", replyCount: 1, isMine: false }),
    ]);
    expect(replies.body.data.items).toEqual([expect.objectContaining({ body: "Thank you!" })]);
    expect((await prisma.outfit.findUniqueOrThrow({ where: { id: outfitId } })).commentCount).toBe(
      2,
    );

    const removed = await request(testApp)
      .delete(`/api/outfits/${outfitId}/comments/${topLevel.body.data.id}`)
      .set("Authorization", fan.auth);
    expect(removed.status).toBe(NO_CONTENT_STATUS);
    expect((await prisma.outfit.findUniqueOrThrow({ where: { id: outfitId } })).commentCount).toBe(
      0,
    );
  });

  it("keeps a shared build's comments to the people it was sent to", async () => {
    const owner = await createOutfitUser("Sita");
    const recipient = await createOutfitUser("Gita");
    const stranger = await createOutfitUser("Hari");
    const { outfitId } = await lockedBuild(owner);
    await writeAtCurrentVersion(owner, "put", outfitId, "/visibility", {
      visibility: "SHARED",
      shareWithUserIds: [recipient.id],
    });
    const commentAs = (caller: OutfitTestUser) =>
      request(testApp)
        .post(`/api/outfits/${outfitId}/comments`)
        .set("Authorization", caller.auth)
        .send({ body: "Nice" });

    expect((await commentAs(recipient)).status).toBe(CREATED_STATUS);
    expect((await commentAs(stranger)).status).toBe(NOT_FOUND_STATUS);
    expect((await request(testApp).get(`/api/outfits/${outfitId}/comments`)).status).toBe(
      NOT_FOUND_STATUS,
    );
  });
});

describe("reports and removal", () => {
  it("takes a reported build out of public view when a moderator removes it", async () => {
    const owner = await createOutfitUser("Sita");
    const reporter = await createOutfitUser("Gita");
    const { outfitId } = await lockedBuild(owner);
    await makePublic(owner, outfitId);
    const { authHeader: adminAuth } = await createAdminSession();

    const reported = await request(testApp)
      .post("/api/content-reports")
      .set("Authorization", reporter.auth)
      .set("User-Agent", REAL_BROWSER_UA)
      .send({ targetType: ContentReportTarget.OUTFIT_BUILD, targetId: outfitId, reason: "SPAM" });
    expect(reported.status).toBeLessThan(300);
    const report = await prisma.contentReport.findFirstOrThrow({ where: { targetId: outfitId } });

    const queue = await request(testApp)
      .get("/api/content-reports")
      .set("Authorization", adminAuth);
    expect(queue.body.data.items[0].target).toMatchObject({
      outfitId,
      lookId: null,
      snippet: "Dashain look",
      author: { id: owner.id },
    });

    const resolved = await request(testApp)
      .post(`/api/content-reports/${report.id}/resolve`)
      .set("Authorization", adminAuth)
      .send({ action: "REMOVE_CONTENT" });
    expect(resolved.status).toBe(OK_STATUS);

    expect((await publicFeed()).body.data.items).toEqual([]);
    expect((await request(testApp).get(`/api/outfits/${outfitId}/public`)).status).toBe(
      NOT_FOUND_STATUS,
    );
  });
});
