import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { MessageKind, NotificationType } from "#generated/prisma/enums.js";
import { CHAT_SYSTEM_EVENT } from "#modules/chat/chat.constants.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { redis } from "#redis/redis.client.js";
import {
  createDirectConversation,
  createOutfitProduct,
  createOutfitUser,
  currentBuildVersion,
  type OutfitTestUser,
  seedOutfitSlotTypes,
  startBuild,
  startBuildOrFail,
  turnOutfitBuilderOn,
  writeToBuild,
} from "#test/integration/outfitFixtures.js";

import { activityWindowGroupKey, notifyOutfitActivity } from "./outfit.notifications.js";

const OK_STATUS = 200;

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await seedOutfitSlotTypes();
});

const writeAtCurrentVersion = async (
  caller: OutfitTestUser,
  method: "put" | "post" | "patch" | "delete",
  outfitId: string,
  path: string,
  body?: Record<string, unknown>,
) => {
  const response = await writeToBuild(
    caller,
    method,
    `/${outfitId}${path}`,
    await currentBuildVersion(outfitId),
    body,
  );
  expect(response.status).toBe(OK_STATUS);
  return response;
};

const deliverActivityEvents = async (outfitId: string): Promise<void> => {
  const activityEvents = await prisma.outboxEvent.findMany({
    where: { topic: OUTBOX_TOPIC.OUTFIT_ACTIVITY, aggregateId: outfitId },
    orderBy: { createdAt: "asc" },
  });
  for (const { id, aggregateId, payload } of activityEvents) {
    await notifyOutfitActivity({ outboxEventId: id, aggregateId, payload });
  }
};

const notificationsFor = (recipientId: string, type: NotificationType) =>
  prisma.notification.findMany({ where: { recipientId, type } });

const buildWithEditor = async () => {
  const owner = await createOutfitUser("Sita");
  const editor = await createOutfitUser("Ram");
  const outfitId = await startBuildOrFail(owner);
  const invited = await writeAtCurrentVersion(owner, "post", outfitId, "/members", {
    userIds: [editor.id],
  });
  return { owner, editor, outfitId, buildChatId: invited.body.data.board.conversationId };
};

describe("the build card", () => {
  it("posts a card into the chat a build was started from", async () => {
    const owner = await createOutfitUser("Sita");
    const friend = await createOutfitUser("Ram");
    const conversation = await createDirectConversation(owner, friend);

    const started = await startBuild(owner, { sourceConversationId: conversation.id });

    const card = await prisma.message.findFirstOrThrow({
      where: { conversationId: conversation.id, kind: MessageKind.OUTFIT_CARD },
    });
    expect(card).toMatchObject({ senderId: owner.id, outfitId: started.body.data.id });
    const friendParticipant = await prisma.conversationParticipant.findUniqueOrThrow({
      where: { conversationId_userId: { conversationId: conversation.id, userId: friend.id } },
    });
    expect(friendParticipant.unreadCount).toBe(1);
    expect(
      await prisma.outboxEvent.count({
        where: { topic: OUTBOX_TOPIC.CHAT_MESSAGE_CREATED, aggregateId: conversation.id },
      }),
    ).toBe(1);
  });
});

describe("lines in the build's chat", () => {
  it("announces item changes, everyone being happy, and locking", async () => {
    const { owner, editor, outfitId, buildChatId } = await buildWithEditor();
    const shirt = await createOutfitProduct("tops");
    const trousers = await createOutfitProduct("bottoms");

    await writeAtCurrentVersion(owner, "put", outfitId, "/slots/top/positions/0", {
      productId: shirt.id,
    });
    await writeAtCurrentVersion(editor, "put", outfitId, "/slots/bottom/positions/0", {
      productId: trousers.id,
    });
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(editor, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(owner, "post", outfitId, "/lock");

    const lines = await prisma.message.findMany({
      where: { conversationId: buildChatId, kind: MessageKind.SYSTEM },
      orderBy: { createdAt: "asc" },
    });
    expect(lines.map((line) => line.systemEvent)).toEqual([
      { type: CHAT_SYSTEM_EVENT.GROUP_CREATED, groupName: "Outfit build" },
      { type: CHAT_SYSTEM_EVENT.OUTFIT_ITEM_ADDED, productName: shirt.name },
      { type: CHAT_SYSTEM_EVENT.OUTFIT_ITEM_ADDED, productName: trousers.name },
      { type: CHAT_SYSTEM_EVENT.OUTFIT_EVERYONE_HAPPY },
      { type: CHAT_SYSTEM_EVENT.OUTFIT_LOCKED },
    ]);
  });
});

describe("notifications", () => {
  it("tells the invited person, with no separate chat alert for the invite", async () => {
    const { editor, outfitId } = await buildWithEditor();

    await deliverActivityEvents(outfitId);

    expect(await notificationsFor(editor.id, NotificationType.OUTFIT_INVITED)).toHaveLength(1);
    expect(await notificationsFor(editor.id, NotificationType.NEW_MESSAGE)).toHaveLength(0);
  });

  it("groups board edits from several people into one alert per window", async () => {
    const owner = await createOutfitUser("Sita");
    const [firstEditor, secondEditor] = await Promise.all([
      createOutfitUser("Ram"),
      createOutfitUser("Gita"),
    ]);
    const outfitId = await startBuildOrFail(owner);
    await writeAtCurrentVersion(owner, "post", outfitId, "/members", {
      userIds: [firstEditor.id, secondEditor.id],
    });
    const [shirt, shoes] = await Promise.all([
      createOutfitProduct("tops"),
      createOutfitProduct("footwear"),
    ]);
    await writeAtCurrentVersion(firstEditor, "put", outfitId, "/slots/top/positions/0", {
      productId: shirt.id,
    });
    await writeAtCurrentVersion(secondEditor, "put", outfitId, "/slots/footwear/positions/0", {
      productId: shoes.id,
    });

    await deliverActivityEvents(outfitId);

    const ownerAlerts = await notificationsFor(owner.id, NotificationType.OUTFIT_BOARD_ACTIVITY);
    expect(ownerAlerts).toHaveLength(1);
    expect(ownerAlerts[0]?.actorCount).toBe(2);
    expect(
      await notificationsFor(firstEditor.id, NotificationType.OUTFIT_BOARD_ACTIVITY),
    ).toHaveLength(1);
  });

  it("tells the owner when everyone is happy and everyone else when it is locked", async () => {
    const { owner, editor, outfitId } = await buildWithEditor();
    const [shirt, trousers] = await Promise.all([
      createOutfitProduct("tops"),
      createOutfitProduct("bottoms"),
    ]);
    await writeAtCurrentVersion(owner, "put", outfitId, "/slots/top/positions/0", {
      productId: shirt.id,
    });
    await writeAtCurrentVersion(owner, "put", outfitId, "/slots/bottom/positions/0", {
      productId: trousers.id,
    });
    await writeAtCurrentVersion(editor, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(owner, "post", outfitId, "/lock");

    await deliverActivityEvents(outfitId);

    expect(await notificationsFor(owner.id, NotificationType.OUTFIT_READY_TO_LOCK)).toHaveLength(0);
    expect(await notificationsFor(editor.id, NotificationType.OUTFIT_LOCKED)).toHaveLength(1);
    expect(await notificationsFor(owner.id, NotificationType.OUTFIT_LOCKED)).toHaveLength(0);
  });

  it("sends the owner a ready-to-lock alert when someone else makes everyone happy", async () => {
    const { owner, editor, outfitId } = await buildWithEditor();
    await writeAtCurrentVersion(owner, "put", outfitId, "/happy", { isHappy: true });
    await writeAtCurrentVersion(editor, "put", outfitId, "/happy", { isHappy: true });

    await deliverActivityEvents(outfitId);

    expect(await notificationsFor(owner.id, NotificationType.OUTFIT_READY_TO_LOCK)).toHaveLength(1);
  });

  it("does not repeat a notification when the same event is delivered twice", async () => {
    const { editor, outfitId } = await buildWithEditor();

    await deliverActivityEvents(outfitId);
    await deliverActivityEvents(outfitId);

    expect(await notificationsFor(editor.id, NotificationType.OUTFIT_INVITED)).toHaveLength(1);
  });
});

describe("activityWindowGroupKey", () => {
  it("puts moments in the same 30-second window under one key", () => {
    const outfitId = "outfit-1";
    expect(activityWindowGroupKey(outfitId, "2026-09-30T10:00:01.000Z")).toBe(
      activityWindowGroupKey(outfitId, "2026-09-30T10:00:29.000Z"),
    );
    expect(activityWindowGroupKey(outfitId, "2026-09-30T10:00:29.000Z")).not.toBe(
      activityWindowGroupKey(outfitId, "2026-09-30T10:00:31.000Z"),
    );
  });
});
