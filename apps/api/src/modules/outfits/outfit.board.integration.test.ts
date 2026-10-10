import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import {
  HTTP_STATUS,
  IDEMPOTENCY_HEADER,
  OUTFIT_VERSION_HEADER,
} from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { FeatureFlagRollout } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { redis } from "#redis/redis.client.js";
import {
  createDirectConversation,
  createOutfitProduct,
  createOutfitUser,
  currentBuildVersion,
  overrideOutfitSetting,
  readBuild,
  seedOutfitSlotTypes,
  setFeatureFlagRollout,
  startBuild,
  startBuildOrFail,
  turnOutfitBuilderOn,
  writeToBuild,
} from "#test/integration/outfit-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { outfitService } from "./outfit.service.js";

const PARALLEL_WRITER_COUNT = 50;
const REPLAY_COUNT = 5;

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await seedOutfitSlotTypes();
});

const slotPath = (outfitId: string, slotKey: string, position: number) =>
  `/${outfitId}/slots/${slotKey}/positions/${position}`;

describe("starting a build", () => {
  it("copies the active slot types and makes the starter the owner", async () => {
    const owner = await createOutfitUser("Sita");

    const response = await startBuild(owner, { title: "Dashain look" });

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.get(OUTFIT_VERSION_HEADER)).toBe("0");
    expect(response.body.data).toMatchObject({
      title: "Dashain look",
      status: "DRAFT",
      visibility: "PRIVATE",
      version: 0,
      myRole: "OWNER",
      itemCount: 0,
      total: 0,
    });
    expect(response.body.data.slots.map((slot: { key: string }) => slot.key)).toEqual([
      "top",
      "bottom",
      "full-outfit",
      "footwear",
      "extra",
    ]);
  });

  it("keeps a build's slots when an admin later changes the slot types", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    await prisma.outfitSlotType.updateMany({ where: { key: "top" }, data: { maxItems: 5 } });
    await prisma.outfitSlotType.updateMany({ where: { key: "extra" }, data: { isActive: false } });

    const board = (await readBuild(owner, outfitId)).body.data;

    expect(board.slots.find((slot: { key: string }) => slot.key === "top").maxItems).toBe(1);
    expect(board.slots.some((slot: { key: string }) => slot.key === "extra")).toBe(true);
  });

  it("needs an Idempotency-Key and creates one build however often the same request is retried", async () => {
    const owner = await createOutfitUser("Sita");
    const withoutKey = await request(testApp)
      .post("/api/outfits")
      .set("Authorization", owner.auth)
      .send({});
    expect(withoutKey.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(withoutKey.body.code).toBe("IDEMPOTENCY_KEY_REQUIRED");

    const idempotencyKey = randomUUID();
    const responses = [];
    for (let attempt = 0; attempt < REPLAY_COUNT; attempt += 1) {
      responses.push(await startBuild(owner, { title: "Once" }, idempotencyKey));
    }

    expect(new Set(responses.map((response) => response.body.data.id)).size).toBe(1);
    expect(await prisma.outfit.count({ where: { createdById: owner.id } })).toBe(1);

    const reusedKey = await startBuild(owner, { title: "Different" }, idempotencyKey);
    expect(reusedKey.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(reusedKey.body.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("refuses to start a build when no slot types are set up", async () => {
    const owner = await createOutfitUser("Sita");
    await prisma.outfitSlotType.updateMany({ data: { isActive: false } });

    const response = await startBuild(owner);

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.code).toBe("NO_SLOT_TYPES");
  });

  it("starts a build inside a chat only for someone in that chat", async () => {
    const owner = await createOutfitUser("Sita");
    const friend = await createOutfitUser("Ram");
    const stranger = await createOutfitUser("Hari");
    const conversation = await createDirectConversation(owner, friend);

    const refused = await startBuild(stranger, { sourceConversationId: conversation.id });
    expect(refused.status).toBe(HTTP_STATUS.NOT_FOUND);

    const started = await startBuild(owner, { sourceConversationId: conversation.id });
    expect(started.status).toBe(HTTP_STATUS.CREATED);
    expect(started.body.data.sourceConversationId).toBe(conversation.id);
  });

  it("caps the builds in progress in one chat", async () => {
    const owner = await createOutfitUser("Sita");
    const friend = await createOutfitUser("Ram");
    const conversation = await createDirectConversation(owner, friend);
    await overrideOutfitSetting("outfit.maxBoardsPerChat", 1);

    await startBuild(owner, { sourceConversationId: conversation.id });
    const secondBuild = await startBuild(owner, { sourceConversationId: conversation.id });

    expect(secondBuild.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(secondBuild.body.code).toBe("TOO_MANY_BUILDS_IN_CHAT");
  });

  it("is hidden behind the outfit_builder flag", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    await setFeatureFlagRollout("outfit_builder", FeatureFlagRollout.OFF);

    for (const response of [await startBuild(owner), await readBuild(owner, outfitId)]) {
      expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
      expect(response.body.code).toBe("FEATURE_NOT_AVAILABLE");
    }
  });
});

describe("placing items", () => {
  it("adds an item, bumps the version, and records history and an outbox event", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    const kurta = await createOutfitProduct("tops", { price: 3_200 });

    const response = await writeToBuild(owner, "put", slotPath(outfitId, "top", 0), 0, {
      productId: kurta.id,
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.get(OUTFIT_VERSION_HEADER)).toBe("1");
    const { version, board } = response.body.data;
    expect(version).toBe(1);
    expect(board).toMatchObject({ itemCount: 1, total: 3_200, isFullyAvailable: true });
    const topSlot = board.slots.find((slot: { key: string }) => slot.key === "top");
    expect(topSlot.items[0]).toMatchObject({
      position: 0,
      product: { id: kurta.id, price: 3_200, availability: "IN_STOCK" },
      addedBy: { id: owner.id },
    });
    expect(board.slots.find((slot: { key: string }) => slot.key === "full-outfit").isBlocked).toBe(
      true,
    );

    const events = await request(testApp)
      .get(`/api/outfits/${outfitId}/events?sinceVersion=0`)
      .set("Authorization", owner.auth);
    expect(events.body.data).toMatchObject({
      currentVersion: 1,
      hasMore: false,
      events: [{ version: 1, type: "ITEM_ADDED", payload: { productId: kurta.id } }],
    });
    expect(
      await prisma.outboxEvent.count({
        where: { topic: OUTBOX_TOPIC.OUTFIT_CHANGED, aggregateId: outfitId },
      }),
    ).toBe(2);
  });

  it("swaps the product when a filled position is filled again", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    const firstShirt = await createOutfitProduct("tops");
    const secondShirt = await createOutfitProduct("tops");
    await writeToBuild(owner, "put", slotPath(outfitId, "top", 0), 0, {
      productId: firstShirt.id,
    });

    const response = await writeToBuild(owner, "put", slotPath(outfitId, "top", 0), 1, {
      productId: secondShirt.id,
    });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.board.itemCount).toBe(1);
    const lastEvent = await prisma.outfitEvent.findFirstOrThrow({
      where: { outfitId },
      orderBy: { version: "desc" },
    });
    expect(lastEvent).toMatchObject({
      type: "ITEM_SWAPPED",
      payload: { productId: secondShirt.id, replacedProductId: firstShirt.id },
    });
  });

  it("refuses items that break the slot rules", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    const shirt = await createOutfitProduct("tops");
    const shoes = await createOutfitProduct("footwear");
    const dress = await createOutfitProduct("dresses");
    await writeToBuild(owner, "put", slotPath(outfitId, "top", 0), 0, { productId: shirt.id });

    const refusals = [
      { path: slotPath(outfitId, "top", 1), productId: shoes.id, code: "SLOT_FULL" },
      {
        path: slotPath(outfitId, "bottom", 0),
        productId: shoes.id,
        code: "WRONG_SLOT_FOR_PRODUCT",
      },
      { path: slotPath(outfitId, "full-outfit", 0), productId: dress.id, code: "SLOT_BLOCKED" },
      {
        path: slotPath(outfitId, "extra", 0),
        productId: shirt.id,
        code: "PRODUCT_ALREADY_ON_BOARD",
      },
      { path: slotPath(outfitId, "cape", 0), productId: shoes.id, code: "UNKNOWN_SLOT" },
    ];
    for (const { path, productId, code } of refusals) {
      const response = await writeToBuild(owner, "put", path, 1, { productId });
      expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
      expect(response.body.code).toBe(code);
    }
    expect(await currentBuildVersion(outfitId)).toBe(1);
  });

  it("refuses an item past the board's item cap", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    await overrideOutfitSetting("outfit.maxItemsPerBoard", 2);
    const [shirt, trousers, shoes] = await Promise.all([
      createOutfitProduct("tops"),
      createOutfitProduct("bottoms"),
      createOutfitProduct("footwear"),
    ]);
    await writeToBuild(owner, "put", slotPath(outfitId, "top", 0), 0, { productId: shirt.id });
    await writeToBuild(owner, "put", slotPath(outfitId, "bottom", 0), 1, {
      productId: trousers.id,
    });

    const response = await writeToBuild(owner, "put", slotPath(outfitId, "footwear", 0), 2, {
      productId: shoes.id,
    });

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.code).toBe("BOARD_FULL");
  });

  it("only takes products that are in stock and on sale", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    const soldOut = await createOutfitProduct("tops", { stock: 0 });

    const response = await writeToBuild(owner, "put", slotPath(outfitId, "top", 0), 0, {
      productId: soldOut.id,
    });

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.code).toBe("PRODUCT_UNAVAILABLE");
  });

  it("works prices out on the server and refuses anything extra in the body", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    const kurta = await createOutfitProduct("tops", { price: 3_200 });

    const tampered = await writeToBuild(owner, "put", slotPath(outfitId, "top", 0), 0, {
      productId: kurta.id,
      price: 1,
    });

    expect(tampered.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(await currentBuildVersion(outfitId)).toBe(0);
  });

  it("removes and reorders items", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    const [first, second] = await Promise.all([
      createOutfitProduct("tops"),
      createOutfitProduct("footwear"),
    ]);
    await writeToBuild(owner, "put", slotPath(outfitId, "extra", 0), 0, { productId: first.id });
    await writeToBuild(owner, "put", slotPath(outfitId, "extra", 1), 1, { productId: second.id });

    const reordered = await writeToBuild(owner, "put", `/${outfitId}/slots/extra/order`, 2, {
      productIds: [second.id, first.id],
    });
    expect(reordered.status).toBe(HTTP_STATUS.OK);
    const extraSlot = reordered.body.data.board.slots.find(
      (slot: { key: string }) => slot.key === "extra",
    );
    expect(extraSlot.items.map((item: { product: { id: string } }) => item.product.id)).toEqual([
      second.id,
      first.id,
    ]);

    const mismatch = await writeToBuild(owner, "put", `/${outfitId}/slots/extra/order`, 3, {
      productIds: [first.id],
    });
    expect(mismatch.body.code).toBe("REORDER_MISMATCH");

    const removed = await writeToBuild(owner, "delete", slotPath(outfitId, "extra", 0), 3);
    expect(removed.status).toBe(HTTP_STATUS.OK);
    expect(removed.body.data.board.itemCount).toBe(1);

    const emptySpot = await writeToBuild(owner, "delete", slotPath(outfitId, "extra", 2), 4);
    expect(emptySpot.status).toBe(HTTP_STATUS.NOT_FOUND);
    expect(emptySpot.body.code).toBe("ITEM_NOT_FOUND");
  });
});

describe("versions and retries", () => {
  it("needs the version header and refuses a stale one with the current version", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    const shirt = await createOutfitProduct("tops");

    const missingVersion = await request(testApp)
      .put(`/api/outfits${slotPath(outfitId, "top", 0)}`)
      .set("Authorization", owner.auth)
      .set(IDEMPOTENCY_HEADER, randomUUID())
      .send({ productId: shirt.id });
    expect(missingVersion.status).toBe(HTTP_STATUS.PRECONDITION_REQUIRED);
    expect(missingVersion.body.code).toBe("OUTFIT_VERSION_REQUIRED");

    const malformedVersion = await request(testApp)
      .put(`/api/outfits${slotPath(outfitId, "top", 0)}`)
      .set("Authorization", owner.auth)
      .set(IDEMPOTENCY_HEADER, randomUUID())
      .set(OUTFIT_VERSION_HEADER, "latest")
      .send({ productId: shirt.id });
    expect(malformedVersion.status).toBe(HTTP_STATUS.BAD_REQUEST);

    const staleVersion = await writeToBuild(owner, "put", slotPath(outfitId, "top", 0), 7, {
      productId: shirt.id,
    });
    expect(staleVersion.status).toBe(HTTP_STATUS.CONFLICT);
    expect(staleVersion.body.code).toBe("OUTFIT_VERSION_CONFLICT");
    expect(await currentBuildVersion(outfitId)).toBe(0);
  });

  it("lets exactly one of many simultaneous edits of the same version through", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    const products = await Promise.all(
      Array.from({ length: PARALLEL_WRITER_COUNT }, () => createOutfitProduct("tops")),
    );

    const outcomes = await Promise.allSettled(
      products.map((product) =>
        outfitService.placeItem(
          {
            actorId: owner.id,
            outfitId,
            expectedVersion: 0,
            idempotencyKey: randomUUID(),
          },
          { slotKey: "top", position: 0 },
          { productId: product.id },
        ),
      ),
    );

    const failureReasons = outcomes.flatMap((outcome) =>
      outcome.status === "rejected" ? [outcome.reason] : [],
    );
    expect(outcomes.filter((outcome) => outcome.status === "fulfilled")).toHaveLength(1);
    expect(failureReasons).toHaveLength(PARALLEL_WRITER_COUNT - 1);
    expect(
      failureReasons.every(
        (reason) => reason instanceof AppError && reason.code === "OUTFIT_VERSION_CONFLICT",
      ),
    ).toBe(true);
    expect(await currentBuildVersion(outfitId)).toBe(1);
    expect(await prisma.outfitItem.count({ where: { outfitId } })).toBe(1);
    expect(await prisma.outfitEvent.count({ where: { outfitId } })).toBe(2);
  });

  it("gives the same answer and makes one change when a write is retried with its key", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    const shirt = await createOutfitProduct("tops");
    const idempotencyKey = randomUUID();

    const responses = [];
    for (let attempt = 0; attempt < REPLAY_COUNT; attempt += 1) {
      responses.push(
        await writeToBuild(
          owner,
          "put",
          slotPath(outfitId, "top", 0),
          0,
          { productId: shirt.id },
          idempotencyKey,
        ),
      );
    }

    expect(responses.every((response) => response.status === HTTP_STATUS.OK)).toBe(true);
    const [firstResponse, ...replayedResponses] = responses;
    for (const replayedResponse of replayedResponses) {
      expect(replayedResponse.body.data).toEqual(firstResponse?.body.data);
    }
    expect(await currentBuildVersion(outfitId)).toBe(1);
  });
});

describe("who can see a build", () => {
  it("hides a build from anyone who isn't on it or in its chat", async () => {
    const owner = await createOutfitUser("Sita");
    const stranger = await createOutfitUser("Hari");
    const outfitId = await startBuildOrFail(owner);
    const shirt = await createOutfitProduct("tops");

    expect((await readBuild(stranger, outfitId)).status).toBe(HTTP_STATUS.NOT_FOUND);
    const strangerWrite = await writeToBuild(stranger, "put", slotPath(outfitId, "top", 0), 0, {
      productId: shirt.id,
    });
    expect(strangerWrite.status).toBe(HTTP_STATUS.NOT_FOUND);
    const strangerEvents = await request(testApp)
      .get(`/api/outfits/${outfitId}/events?sinceVersion=0`)
      .set("Authorization", stranger.auth);
    expect(strangerEvents.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it("shows someone in the chat it started in the live board, read-only and without the build chat", async () => {
    const owner = await createOutfitUser("Sita");
    const friend = await createOutfitUser("Ram");
    const conversation = await createDirectConversation(owner, friend);
    const started = await startBuild(owner, { sourceConversationId: conversation.id });
    const outfitId = started.body.data.id;
    const shirt = await createOutfitProduct("tops");

    const view = await readBuild(friend, outfitId);
    expect(view.status).toBe(HTTP_STATUS.OK);
    expect(view.body.data).toMatchObject({ kind: "board", myRole: "VIEWER", conversationId: null });

    const viewerWrite = await writeToBuild(friend, "put", slotPath(outfitId, "top", 0), 0, {
      productId: shirt.id,
    });
    expect(viewerWrite.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it("lists a member's builds, newest first, and pages through them", async () => {
    const owner = await createOutfitUser("Sita");
    const firstId = await startBuildOrFail(owner);
    const secondId = await startBuildOrFail(owner);

    const firstPage = await request(testApp)
      .get("/api/outfits?limit=1")
      .set("Authorization", owner.auth);
    expect(firstPage.body.data.items.map((item: { id: string }) => item.id)).toEqual([secondId]);

    const secondPage = await request(testApp)
      .get(`/api/outfits?limit=1&cursor=${firstPage.body.data.nextCursor}`)
      .set("Authorization", owner.auth);
    expect(secondPage.body.data.items.map((item: { id: string }) => item.id)).toEqual([firstId]);
    expect(secondPage.body.data.nextCursor).toBeNull();
  });
});
