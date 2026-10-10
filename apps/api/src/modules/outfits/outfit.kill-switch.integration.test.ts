import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { CreatorStatus, FeatureFlagRollout, OutfitStatus } from "#generated/prisma/enums.js";
import { runOutfitOfferLifecycleSweep } from "#modules/outfit-offers/outfit-offer.lifecycle.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import {
  createDirectConversation,
  createOutfitUser,
  currentBuildVersion,
  readBuild,
  seedOutfitSlotTypes,
  setFeatureFlagRollout,
  startBuildOrFail,
  turnOutfitBuilderOn,
  writeToBuild,
} from "#test/integration/outfit-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await seedOutfitSlotTypes();
});

const switchOutfitBuildOff = () => setFeatureFlagRollout("outfit_builder", FeatureFlagRollout.OFF);

describe("the Outfit Build safety switch", () => {
  it("closes every build route at once and opens them again with the build untouched", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    await writeToBuild(
      owner,
      "patch",
      `/${outfitId}/settings`,
      await currentBuildVersion(outfitId),
      {
        title: "Still here",
      },
    );

    await switchOutfitBuildOff();

    expect((await readBuild(owner, outfitId)).status).toBe(HTTP_STATUS.NOT_FOUND);
    const writeWhileOff = await writeToBuild(
      owner,
      "put",
      `/${outfitId}/happy`,
      await currentBuildVersion(outfitId),
      { isHappy: true },
    );
    expect(writeWhileOff.status).toBe(HTTP_STATUS.NOT_FOUND);
    const myBuilds = await request(testApp).get("/api/outfits").set("Authorization", owner.auth);
    expect(myBuilds.status).toBe(HTTP_STATUS.NOT_FOUND);
    const offers = await request(testApp)
      .get("/api/outfit-offers/received")
      .set("Authorization", owner.auth);
    expect(offers.status).toBe(HTTP_STATUS.NOT_FOUND);

    await turnOutfitBuilderOn();

    const reopened = await readBuild(owner, outfitId);
    expect(reopened.status).toBe(HTTP_STATUS.OK);
    expect(reopened.body.data).toMatchObject({ title: "Still here", status: OutfitStatus.DRAFT });
  });

  it("stops build background jobs while it is off", async () => {
    await switchOutfitBuildOff();

    const sweep = await runOutfitOfferLifecycleSweep();

    expect(Object.values(sweep).every((count) => count === 0)).toBe(true);
  });

  it("keeps chat and Creator Looks working while it is off", async () => {
    const sender = await createOutfitUser("Ram");
    const receiver = await createOutfitUser("Gita");
    const conversation = await createDirectConversation(sender, receiver);
    await prisma.user.update({
      where: { id: sender.id },
      data: { isCreator: true, creatorStatus: CreatorStatus.APPROVED },
    });

    await switchOutfitBuildOff();

    const message = await request(testApp)
      .post(`/api/conversations/${conversation.id}/messages`)
      .set("Authorization", sender.auth)
      .send({ body: "Still chatting" });
    expect(message.status).toBe(HTTP_STATUS.OK);

    const look = await request(testApp)
      .post("/api/creator-looks")
      .set("Authorization", sender.auth)
      .send({ imageUrls: ["https://cdn.outfiqe.test/still-posting.jpg"], taggedProducts: [] });
    expect(look.status).toBe(HTTP_STATUS.CREATED);
  });
});
