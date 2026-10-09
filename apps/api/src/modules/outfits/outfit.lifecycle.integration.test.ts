import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  FeatureFlagRollout,
  MessageKind,
  OutfitOfferStatus,
  PaymentMethod,
} from "#generated/prisma/enums.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { redis } from "#redis/redis.client.js";
import {
  createOutfitProduct,
  createOutfitUser,
  currentBuildVersion,
  type OutfitTestUser,
  overrideOutfitSetting,
  readBuild,
  seedOutfitSlotTypes,
  setFeatureFlagRollout,
  startBuildOrFail,
  turnOutfitBuilderOn,
  writeToBuild,
} from "#test/integration/outfitFixtures.js";
import { testApp } from "#test/integration/testApp.js";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await setFeatureFlagRollout("outfit_public_feed", FeatureFlagRollout.OFF);
  await seedOutfitSlotTypes();
});

const slotPath = (outfitId: string, slotKey: string, position: number) =>
  `/${outfitId}/slots/${slotKey}/positions/${position}`;

const placeOrFail = async (
  caller: OutfitTestUser,
  outfitId: string,
  slotKey: string,
  position: number,
  productId: string,
) => {
  const response = await writeToBuild(
    caller,
    "put",
    slotPath(outfitId, slotKey, position),
    await currentBuildVersion(outfitId),
    { productId },
  );
  expect(response.status).toBe(HTTP_STATUS.OK);
  return response;
};

const writeAtCurrentVersion = async (
  caller: OutfitTestUser,
  method: "put" | "post" | "patch" | "delete",
  outfitId: string,
  path: string,
  body?: Record<string, unknown>,
) => writeToBuild(caller, method, `/${outfitId}${path}`, await currentBuildVersion(outfitId), body);

const buildWithTwoItems = async (owner: OutfitTestUser) => {
  const outfitId = await startBuildOrFail(owner);
  const shirt = await createOutfitProduct("tops", { price: 3_200 });
  const trousers = await createOutfitProduct("bottoms", { price: 1_200 });
  await placeOrFail(owner, outfitId, "top", 0, shirt.id);
  await placeOrFail(owner, outfitId, "bottom", 0, trousers.id);
  return { outfitId, shirt, trousers };
};

describe("agreeing and locking", () => {
  it("locks once everyone is happy, saving the prices and the people", async () => {
    const owner = await createOutfitUser("Sita");
    const { outfitId } = await buildWithTwoItems(owner);

    const notHappyYet = await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
    expect(notHappyYet.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(notHappyYet.body.code).toBe("NOT_EVERYONE_HAPPY");

    const happy = await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
    expect(happy.body.data.board.isEveryoneHappy).toBe(true);

    const locked = await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
    expect(locked.status).toBe(HTTP_STATUS.OK);
    expect(locked.body.data.board.status).toBe("LOCKED");

    const snapshot = await prisma.outfitSnapshot.findFirstOrThrow({ where: { outfitId } });
    expect(snapshot).toMatchObject({
      version: locked.body.data.version,
      total: 4_400,
      contributorIds: [owner.id],
    });
  });

  it("needs enough items and nothing sold out before it will lock", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);
    const shirt = await createOutfitProduct("tops");
    await placeOrFail(owner, outfitId, "top", 0, shirt.id);
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });

    const tooFew = await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
    expect(tooFew.body.code).toBe("NOT_ENOUGH_ITEMS");

    const trousers = await createOutfitProduct("bottoms");
    await placeOrFail(owner, outfitId, "bottom", 0, trousers.id);
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
    await prisma.productSize.updateMany({ where: { productId: shirt.id }, data: { stock: 0 } });

    const soldOut = await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
    expect(soldOut.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(soldOut.body).toMatchObject({
      code: "ITEMS_SOLD_OUT",
      details: { soldOutProductIds: [shirt.id] },
    });
  });

  it("clears everyone's I'm happy whenever the outfit changes", async () => {
    const owner = await createOutfitUser("Sita");
    const { outfitId } = await buildWithTwoItems(owner);
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });

    const shoes = await createOutfitProduct("footwear");
    const changed = await placeOrFail(owner, outfitId, "footwear", 0, shoes.id);

    expect(changed.body.data.board.members[0].isHappy).toBe(false);
  });

  it("stops edits while locked, and unlocking reopens the board with happiness cleared", async () => {
    const owner = await createOutfitUser("Sita");
    const { outfitId } = await buildWithTwoItems(owner);
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
    const shoes = await createOutfitProduct("footwear");

    const lockedEdit = await writeAtCurrentVersion(
      owner,
      "put",
      outfitId,
      "/slots/footwear/positions/0",
      {
        productId: shoes.id,
      },
    );
    expect(lockedEdit.status).toBe(HTTP_STATUS.CONFLICT);
    expect(lockedEdit.body.code).toBe("OUTFIT_NOT_EDITABLE");

    const unlocked = await writeAtCurrentVersion(owner, "post", outfitId, "/unlock");
    const lockedSnapshot = await prisma.outfitSnapshot.findFirstOrThrow({ where: { outfitId } });
    expect(unlocked.body.data.board).toMatchObject({
      status: "DRAFT",
      isEveryoneHappy: false,
      lastLockedVersion: lockedSnapshot.version,
    });
  });

  it("archives a build, hiding it from My Builds", async () => {
    const owner = await createOutfitUser("Sita");
    const outfitId = await startBuildOrFail(owner);

    const archived = await writeAtCurrentVersion(owner, "post", outfitId, "/archive");
    expect(archived.body.data.board.status).toBe("ARCHIVED");

    const myBuilds = await request(testApp).get("/api/outfits").set("Authorization", owner.auth);
    expect(myBuilds.body.data.items).toEqual([]);
  });
});

describe("people on a build", () => {
  it("creates the build's group chat when the first editor joins and lets editors edit", async () => {
    const owner = await createOutfitUser("Sita");
    const editor = await createOutfitUser("Ram");
    const outfitId = await startBuildOrFail(owner);

    const added = await writeAtCurrentVersion(owner, "post", outfitId, "/members", {
      userIds: [editor.id],
    });
    expect(added.status).toBe(HTTP_STATUS.OK);
    const { conversationId } = added.body.data.board;
    expect(conversationId).toEqual(expect.any(String));

    const participantIds = (
      await prisma.conversationParticipant.findMany({ where: { conversationId } })
    ).map((participant) => participant.userId);
    expect(participantIds.sort()).toEqual([owner.id, editor.id].sort());
    expect(
      await prisma.message.count({ where: { conversationId, kind: MessageKind.SYSTEM } }),
    ).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: { topic: OUTBOX_TOPIC.CHAT_MESSAGE_CREATED, aggregateId: conversationId },
      }),
    ).toBe(1);

    const shirt = await createOutfitProduct("tops");
    await placeOrFail(editor, outfitId, "top", 0, shirt.id);
  });

  it("keeps the build chat's membership in the build's hands", async () => {
    const owner = await createOutfitUser("Sita");
    const editor = await createOutfitUser("Ram");
    const outsider = await createOutfitUser("Hari");
    const outfitId = await startBuildOrFail(owner);
    const added = await writeAtCurrentVersion(owner, "post", outfitId, "/members", {
      userIds: [editor.id],
    });
    const { conversationId } = added.body.data.board;

    const chatAdd = await request(testApp)
      .post(`/api/conversations/${conversationId}/members`)
      .set("Authorization", owner.auth)
      .send({ userIds: [outsider.id] });

    expect(chatAdd.status).toBe(HTTP_STATUS.CONFLICT);
    expect(chatAdd.body.code).toBe("BUILD_CHAT_MANAGED_BY_BUILD");
  });

  it("lets only the owner manage people, and caps the number of editors", async () => {
    const owner = await createOutfitUser("Sita");
    const editor = await createOutfitUser("Ram");
    const [thirdPerson, fourthPerson] = await Promise.all([
      createOutfitUser("Gita"),
      createOutfitUser("Hari"),
    ]);
    const outfitId = await startBuildOrFail(owner);
    await overrideOutfitSetting("outfit.maxEditorsPerBoard", 2);
    await writeAtCurrentVersion(owner, "post", outfitId, "/members", { userIds: [editor.id] });

    const editorInvite = await writeAtCurrentVersion(editor, "post", outfitId, "/members", {
      userIds: [thirdPerson.id],
    });
    expect(editorInvite.status).toBe(HTTP_STATUS.FORBIDDEN);

    const overCap = await writeAtCurrentVersion(owner, "post", outfitId, "/members", {
      userIds: [thirdPerson.id, fourthPerson.id],
    });
    expect(overCap.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(overCap.body.code).toBe("TOO_MANY_EDITORS");
  });

  it("refuses to add someone who has blocked the owner", async () => {
    const owner = await createOutfitUser("Sita");
    const blocker = await createOutfitUser("Ram");
    await prisma.chatBlock.create({ data: { blockerId: blocker.id, blockedId: owner.id } });
    const outfitId = await startBuildOrFail(owner);

    const response = await writeAtCurrentVersion(owner, "post", outfitId, "/members", {
      userIds: [blocker.id],
    });

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body).toMatchObject({
      code: "PEOPLE_UNAVAILABLE",
      details: { unavailableUserIds: [blocker.id] },
    });
  });

  it("applies the owner's per-person item limit", async () => {
    const owner = await createOutfitUser("Sita");
    const editor = await createOutfitUser("Ram");
    const outfitId = await startBuildOrFail(owner);
    await writeAtCurrentVersion(owner, "post", outfitId, "/members", { userIds: [editor.id] });
    await writeAtCurrentVersion(owner, "patch", outfitId, "/settings", { maxItemsPerMember: 1 });
    const [shirt, shoes] = await Promise.all([
      createOutfitProduct("tops"),
      createOutfitProduct("footwear"),
    ]);
    await placeOrFail(editor, outfitId, "top", 0, shirt.id);

    const secondItem = await writeAtCurrentVersion(
      editor,
      "put",
      outfitId,
      "/slots/footwear/positions/0",
      { productId: shoes.id },
    );

    expect(secondItem.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(secondItem.body.code).toBe("MEMBER_ITEM_LIMIT_REACHED");
  });

  it("removes an editor, lets an editor leave, and makes the owner hand over first", async () => {
    const owner = await createOutfitUser("Sita");
    const [firstEditor, secondEditor] = await Promise.all([
      createOutfitUser("Ram"),
      createOutfitUser("Gita"),
    ]);
    const outfitId = await startBuildOrFail(owner);
    const added = await writeAtCurrentVersion(owner, "post", outfitId, "/members", {
      userIds: [firstEditor.id, secondEditor.id],
    });
    const { conversationId } = added.body.data.board;

    const removed = await writeAtCurrentVersion(
      owner,
      "delete",
      outfitId,
      `/members/${firstEditor.id}`,
    );
    expect(removed.status).toBe(HTTP_STATUS.OK);

    const left = await writeAtCurrentVersion(secondEditor, "post", outfitId, "/leave");
    expect(left.status).toBe(HTTP_STATUS.OK);
    expect(left.body.data.board).toBeNull();

    const ownerLeaves = await writeAtCurrentVersion(owner, "post", outfitId, "/leave");
    expect(ownerLeaves.body.code).toBe("OWNER_MUST_HAND_OVER");

    const remainingChatIds = (
      await prisma.conversationParticipant.findMany({ where: { conversationId } })
    ).map((participant) => participant.userId);
    expect(remainingChatIds).toEqual([owner.id]);
    expect(
      await prisma.outboxEvent.count({
        where: { topic: OUTBOX_TOPIC.CHAT_MEMBER_REMOVED, aggregateId: conversationId },
      }),
    ).toBe(2);
  });

  it("takes someone who leaves off every locked version, but keeps someone the owner removed", async () => {
    const owner = await createOutfitUser("Sita");
    const [leaver, removedEditor] = await Promise.all([
      createOutfitUser("Ram"),
      createOutfitUser("Gita"),
    ]);
    const outfitId = await startBuildOrFail(owner);
    await writeAtCurrentVersion(owner, "post", outfitId, "/members", {
      userIds: [leaver.id, removedEditor.id],
    });
    const everyone = [owner.id, leaver.id, removedEditor.id];
    await prisma.outfitSnapshot.createMany({
      data: [1, 2].map((version) => ({
        outfitId,
        version,
        items: [],
        total: 0,
        contributorIds: everyone,
      })),
    });

    const left = await writeAtCurrentVersion(leaver, "post", outfitId, "/leave");
    const removed = await writeAtCurrentVersion(
      owner,
      "delete",
      outfitId,
      `/members/${removedEditor.id}`,
    );

    expect(left.status).toBe(HTTP_STATUS.OK);
    expect(removed.status).toBe(HTTP_STATUS.OK);
    const snapshots = await prisma.outfitSnapshot.findMany({
      where: { outfitId },
      orderBy: { version: "asc" },
      select: { contributorIds: true },
    });
    expect(snapshots.map(({ contributorIds }) => contributorIds)).toEqual([
      [owner.id, removedEditor.id],
      [owner.id, removedEditor.id],
    ]);
  });

  it("asks a creator to settle an open offer on the build before leaving it", async () => {
    const owner = await createOutfitUser("Sita");
    const creator = await createOutfitUser("Ram");
    const outfitId = await startBuildOrFail(owner);
    await writeAtCurrentVersion(owner, "post", outfitId, "/members", { userIds: [creator.id] });
    await prisma.outfitSnapshot.create({
      data: { outfitId, version: 1, items: [], total: 0, contributorIds: [owner.id, creator.id] },
    });
    const { brandId } = await createOutfitProduct("tops");
    const offer = await prisma.outfitOffer.create({
      data: {
        outfitId,
        outfitVersion: 1,
        brandId,
        creatorId: creator.id,
        amount: 2_000,
        paymentMethod: PaymentMethod.ESEWA,
        status: OutfitOfferStatus.ACCEPTED,
      },
    });

    const blocked = await writeAtCurrentVersion(creator, "post", outfitId, "/leave");

    expect(blocked.status).toBe(HTTP_STATUS.CONFLICT);
    expect(blocked.body.code).toBe("OPEN_OFFER_BLOCKS_LEAVE");
    expect(await prisma.outfitMember.count({ where: { outfitId, userId: creator.id } })).toBe(1);
    expect(
      (await prisma.outfitSnapshot.findFirstOrThrow({ where: { outfitId } })).contributorIds,
    ).toEqual([owner.id, creator.id]);

    await prisma.outfitOffer.update({
      where: { id: offer.id },
      data: { status: OutfitOfferStatus.DECLINED },
    });
    const leftAfterSettling = await writeAtCurrentVersion(creator, "post", outfitId, "/leave");

    expect(leftAfterSettling.status).toBe(HTTP_STATUS.OK);
  });

  it("hands ownership over to an editor", async () => {
    const owner = await createOutfitUser("Sita");
    const editor = await createOutfitUser("Ram");
    const outfitId = await startBuildOrFail(owner);
    await writeAtCurrentVersion(owner, "post", outfitId, "/members", { userIds: [editor.id] });

    const handedOver = await writeAtCurrentVersion(owner, "post", outfitId, "/transfer-ownership", {
      userId: editor.id,
    });

    expect(handedOver.body.data.board.myRole).toBe("EDITOR");
    const editorView = await readBuild(editor, outfitId);
    expect(editorView.body.data.myRole).toBe("OWNER");
  });
});

describe("sharing and publishing", () => {
  it("needs a lock before a build can be shared", async () => {
    const owner = await createOutfitUser("Sita");
    const friend = await createOutfitUser("Ram");
    const outfitId = await startBuildOrFail(owner);

    const response = await writeAtCurrentVersion(owner, "put", outfitId, "/visibility", {
      visibility: "SHARED",
      shareWithUserIds: [friend.id],
    });

    expect(response.status).toBe(HTTP_STATUS.CONFLICT);
    expect(response.body.code).toBe("OUTFIT_NEVER_LOCKED");
  });

  it("shows the locked version to the people it was sent to, and no one else", async () => {
    const owner = await createOutfitUser("Sita");
    const friend = await createOutfitUser("Ram");
    const stranger = await createOutfitUser("Hari");
    const { outfitId, shirt } = await buildWithTwoItems(owner);
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(owner, "post", outfitId, "/lock");

    const shared = await writeAtCurrentVersion(owner, "put", outfitId, "/visibility", {
      visibility: "SHARED",
      shareWithUserIds: [friend.id],
    });
    expect(shared.status).toBe(HTTP_STATUS.OK);

    const friendView = await readBuild(friend, outfitId);
    expect(friendView.body.data).toMatchObject({
      kind: "published",
      myRole: "VIEWER",
      total: 4_400,
      contributors: [expect.objectContaining({ id: owner.id })],
    });
    expect(
      friendView.body.data.items.map((item: { productId: string }) => item.productId),
    ).toContain(shirt.id);

    expect((await readBuild(stranger, outfitId)).status).toBe(HTTP_STATUS.NOT_FOUND);

    const sharedWithFriend = await request(testApp)
      .get("/api/outfits/shared-with-me")
      .set("Authorization", friend.auth);
    expect(sharedWithFriend.body.data.items.map((item: { id: string }) => item.id)).toEqual([
      outfitId,
    ]);
  });

  it("keeps public builds behind the public feed flag", async () => {
    const owner = await createOutfitUser("Sita");
    const stranger = await createOutfitUser("Hari");
    const { outfitId } = await buildWithTwoItems(owner);
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(owner, "post", outfitId, "/lock");

    const withoutFlag = await writeAtCurrentVersion(owner, "put", outfitId, "/visibility", {
      visibility: "PUBLIC",
    });
    expect(withoutFlag.status).toBe(HTTP_STATUS.NOT_FOUND);

    await setFeatureFlagRollout("outfit_public_feed", FeatureFlagRollout.EVERYONE);
    const madePublic = await writeAtCurrentVersion(owner, "put", outfitId, "/visibility", {
      visibility: "PUBLIC",
    });
    expect(madePublic.status).toBe(HTTP_STATUS.OK);
    expect((await readBuild(stranger, outfitId)).body.data.kind).toBe("published");
  });
});
