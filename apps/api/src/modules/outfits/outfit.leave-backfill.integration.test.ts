import { readFileSync } from "node:fs";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { OutfitEventType } from "#generated/prisma/enums.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import {
  createOutfitUser,
  seedOutfitSlotTypes,
  startBuildOrFail,
  turnOutfitBuilderOn,
} from "#test/integration/outfitFixtures.js";

const BACKFILL_MIGRATION_PATH = join(
  process.cwd(),
  "prisma/migrations/20261005120000_drop_build_credit_for_people_who_left/migration.sql",
);
const FIRST_HISTORY_VERSION = 100;

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await seedOutfitSlotTypes();
});

describe("taking people who already left off a build's credit", () => {
  it("drops only those whose last change was leaving, and keeps everyone else in order", async () => {
    const owner = await createOutfitUser("Sita");
    const [leftForGood, removedByOwner, cameBack, cameBackThenRemoved] = await Promise.all([
      createOutfitUser("Ram"),
      createOutfitUser("Gita"),
      createOutfitUser("Hari"),
      createOutfitUser("Maya"),
    ]);
    const outfitId = await startBuildOrFail(owner);
    await prisma.outfitMember.create({
      data: { outfitId, userId: cameBack.id, invitedById: owner.id },
    });
    const history: { type: OutfitEventType; payload: object }[] = [
      {
        type: OutfitEventType.MEMBER_ADDED,
        payload: {
          userIds: [leftForGood.id, removedByOwner.id, cameBack.id, cameBackThenRemoved.id],
        },
      },
      { type: OutfitEventType.MEMBER_LEFT, payload: { userId: leftForGood.id } },
      { type: OutfitEventType.MEMBER_REMOVED, payload: { userId: removedByOwner.id } },
      { type: OutfitEventType.MEMBER_LEFT, payload: { userId: cameBack.id } },
      { type: OutfitEventType.MEMBER_LEFT, payload: { userId: cameBackThenRemoved.id } },
      {
        type: OutfitEventType.MEMBER_ADDED,
        payload: { userIds: [cameBack.id, cameBackThenRemoved.id] },
      },
      { type: OutfitEventType.MEMBER_REMOVED, payload: { userId: cameBackThenRemoved.id } },
    ];
    await prisma.outfitEvent.createMany({
      data: history.map(({ type, payload }, index) => ({
        outfitId,
        version: FIRST_HISTORY_VERSION + index,
        actorId: owner.id,
        type,
        payload,
      })),
    });
    const everyone = [
      owner.id,
      leftForGood.id,
      removedByOwner.id,
      cameBack.id,
      cameBackThenRemoved.id,
    ];
    await prisma.outfitSnapshot.createMany({
      data: [1, 2].map((version) => ({
        outfitId,
        version,
        items: [],
        total: 0,
        contributorIds: everyone,
      })),
    });

    await prisma.$executeRawUnsafe(readFileSync(BACKFILL_MIGRATION_PATH, "utf8"));

    const snapshots = await prisma.outfitSnapshot.findMany({
      where: { outfitId },
      orderBy: { version: "asc" },
      select: { contributorIds: true },
    });
    const everyoneButTheLeaver = everyone.filter((userId) => userId !== leftForGood.id);
    expect(snapshots.map(({ contributorIds }) => contributorIds)).toEqual([
      everyoneButTheLeaver,
      everyoneButTheLeaver,
    ]);
  });
});
