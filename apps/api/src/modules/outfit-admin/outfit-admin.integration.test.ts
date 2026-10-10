import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { OutfitEventType, OutfitStatus } from "#generated/prisma/enums.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import {
  createAdminSessionWithPlatformPermissions,
  createRoleLimitedStaffSession,
} from "#test/integration/auth-helpers.js";
import {
  createOutfitProduct,
  createOutfitUser,
  currentBuildVersion,
  type OutfitTestUser,
  seedOutfitSlotTypes,
  startBuild,
  startBuildOrFail,
  turnOutfitBuilderOn,
  writeToBuild,
} from "#test/integration/outfit-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { outfitAdminRepository } from "./outfit-admin.repository.js";

const REASON = "Owner asked support to reopen it.";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await seedOutfitSlotTypes();
});

const writeAtCurrentVersion = async (
  caller: OutfitTestUser,
  method: "put" | "post" | "patch",
  outfitId: string,
  path: string,
  body?: Record<string, unknown>,
) => writeToBuild(caller, method, `/${outfitId}${path}`, await currentBuildVersion(outfitId), body);

const lockedBuild = async (owner: OutfitTestUser, title: string) => {
  const outfitId = await startBuildOrFail(owner);
  await writeAtCurrentVersion(owner, "patch", outfitId, "/settings", { title });
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
  return outfitId;
};

const asStaff = (authHeader: string) => ({
  get: (path: string) =>
    request(testApp).get(`/api/platform${path}`).set("Authorization", authHeader),
  post: (path: string, body?: Record<string, unknown>) =>
    request(testApp).post(`/api/platform${path}`).set("Authorization", authHeader).send(body),
});

describe("admin build list and detail", () => {
  it("finds builds by title or owner, and shows everything about one build", async () => {
    const owner = await createOutfitUser("Sita Rai");
    const outfitId = await lockedBuild(owner, "Dashain wedding guest");
    await startBuildOrFail(await createOutfitUser("Hari"));
    const { authHeader } = await createAdminSessionWithPlatformPermissions("platform:builds:read");
    const staff = asStaff(authHeader);

    const byTitle = await staff.get("/builds?search=dashain");
    expect(byTitle.status).toBe(HTTP_STATUS.OK);
    expect(byTitle.body.data.items.map(({ id }: { id: string }) => id)).toEqual([outfitId]);
    expect(byTitle.body.data.items[0]).toMatchObject({
      status: OutfitStatus.LOCKED,
      itemCount: 2,
      memberCount: 1,
      owner: { id: owner.id, name: "Sita Rai" },
    });

    const byOwner = await staff.get("/builds?search=sita");
    expect(byOwner.body.data.items.map(({ id }: { id: string }) => id)).toEqual([outfitId]);

    const lockedOnly = await staff.get(`/builds?status=${OutfitStatus.LOCKED}`);
    expect(lockedOnly.body.data.items.map(({ id }: { id: string }) => id)).toContain(outfitId);
    expect(
      lockedOnly.body.data.items.every(
        ({ status }: { status: OutfitStatus }) => status === OutfitStatus.LOCKED,
      ),
    ).toBe(true);

    const detail = await staff.get(`/builds/${outfitId}`);
    expect(detail.status).toBe(HTTP_STATUS.OK);
    expect(detail.body.data.members).toHaveLength(1);
    expect(detail.body.data.items).toHaveLength(2);
    expect(detail.body.data.versions).toHaveLength(1);
    expect(detail.body.data.versions[0]).toMatchObject({ itemCount: 2, total: 4_400 });
    expect(detail.body.data).toMatchObject({ looks: [], photos: [], openReportCount: 0 });
  });

  it("pages through a build's history, newest first", async () => {
    const owner = await createOutfitUser("Sita Rai");
    const outfitId = await lockedBuild(owner, "History build");
    const { authHeader } = await createAdminSessionWithPlatformPermissions("platform:builds:read");

    const history = await asStaff(authHeader).get(`/builds/${outfitId}/history`);

    expect(history.status).toBe(HTTP_STATUS.OK);
    const types = history.body.data.events.map(({ type }: { type: string }) => type);
    expect(types[0]).toBe(OutfitEventType.LOCKED);
    expect(types.at(-1)).toBe(OutfitEventType.CREATED);
    expect(history.body.data.nextBeforeVersion).toBeNull();
  });

  it("answers 404 for an unknown build and 403 for staff without build access", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions("platform:builds:read");
    const missing = await asStaff(authHeader).get("/builds/00000000-0000-4000-8000-000000000000");
    expect(missing.status).toBe(HTTP_STATUS.NOT_FOUND);

    const { authHeader: supportHeader } =
      await createRoleLimitedStaffSession("platform:support:read");
    expect((await asStaff(supportHeader).get("/builds")).status).toBe(HTTP_STATUS.FORBIDDEN);
    expect((await asStaff(supportHeader).get("/builds/metrics")).status).toBe(
      HTTP_STATUS.FORBIDDEN,
    );
  });
});

describe("unlocking and archiving a build as staff", () => {
  it("unlocks a locked build, bumps its version, records history and audits it", async () => {
    const owner = await createOutfitUser("Sita Rai");
    const outfitId = await lockedBuild(owner, "Reopen me");
    const versionBefore = await currentBuildVersion(outfitId);
    const { authHeader, userId } =
      await createAdminSessionWithPlatformPermissions("platform:builds:manage");

    const unlocked = await asStaff(authHeader).post(`/builds/${outfitId}/unlock`, {
      reason: REASON,
    });

    expect(unlocked.status).toBe(HTTP_STATUS.OK);
    const outfit = await prisma.outfit.findUniqueOrThrow({ where: { id: outfitId } });
    expect(outfit).toMatchObject({ status: OutfitStatus.DRAFT, lockedAt: null });
    expect(outfit.version).toBe(versionBefore + 1);
    const event = await prisma.outfitEvent.findUniqueOrThrow({
      where: { outfitId_version: { outfitId, version: outfit.version } },
    });
    expect(event).toMatchObject({ type: OutfitEventType.UNLOCKED, actorId: userId });
    expect(event.payload).toMatchObject({ byStaff: true, reason: REASON });
    const members = await prisma.outfitMember.findMany({ where: { outfitId } });
    expect(members.every(({ isHappy }) => !isHappy)).toBe(true);
    const audit = await prisma.platformAuditLog.findFirstOrThrow({
      where: { targetId: outfitId, action: "outfit-build.unlocked-by-admin" },
    });
    expect(audit.metadata).toMatchObject({ reason: REASON });

    const again = await asStaff(authHeader).post(`/builds/${outfitId}/unlock`, { reason: REASON });
    expect(again.status).toBe(HTTP_STATUS.CONFLICT);
  });

  it("archives a draft build and refuses to archive it twice", async () => {
    const owner = await createOutfitUser("Sita Rai");
    const created = await startBuild(owner);
    const outfitId: string = created.body.data.id;
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:builds:manage");
    const staff = asStaff(authHeader);

    expect((await staff.post(`/builds/${outfitId}/archive`, { reason: REASON })).status).toBe(
      HTTP_STATUS.OK,
    );
    const outfit = await prisma.outfit.findUniqueOrThrow({ where: { id: outfitId } });
    expect(outfit.status).toBe(OutfitStatus.ARCHIVED);
    expect(outfit.archivedAt).not.toBeNull();

    expect((await staff.post(`/builds/${outfitId}/archive`, { reason: REASON })).status).toBe(
      HTTP_STATUS.CONFLICT,
    );
  });

  it("needs a reason, and keeps read-only staff from changing builds", async () => {
    const owner = await createOutfitUser("Sita Rai");
    const outfitId = await lockedBuild(owner, "Keep me");
    const { authHeader: managerHeader } =
      await createAdminSessionWithPlatformPermissions("platform:builds:manage");
    const noReason = await asStaff(managerHeader).post(`/builds/${outfitId}/unlock`, {});
    expect(noReason.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);

    const { authHeader: readerHeader } =
      await createRoleLimitedStaffSession("platform:builds:read");
    const reader = asStaff(readerHeader);
    expect((await reader.get(`/builds/${outfitId}`)).status).toBe(HTTP_STATUS.OK);
    expect((await reader.post(`/builds/${outfitId}/unlock`, { reason: REASON })).status).toBe(
      HTTP_STATUS.FORBIDDEN,
    );
  });
});

describe("build metrics", () => {
  it("counts builds started and locked this week, likes, and the shared and public totals", async () => {
    const owner = await createOutfitUser("Sita Rai");
    const outfitId = await lockedBuild(owner, "Metrics build");
    await startBuildOrFail(await createOutfitUser("Hari"));
    const fan = await createOutfitUser("Gita");
    await prisma.outfitLike.create({ data: { outfitId, userId: fan.id } });
    const { authHeader } = await createAdminSessionWithPlatformPermissions("platform:builds:read");

    const metrics = await asStaff(authHeader).get("/builds/metrics?weeks=4");

    expect(metrics.status).toBe(HTTP_STATUS.OK);
    const { weeks, sharedBuildCount, publicBuildCount, commissionByTier } = metrics.body.data;
    const thisWeek = weeks.at(-1);
    expect(thisWeek).toMatchObject({ buildsStartedAlone: 2, buildsLocked: 1, likes: 1 });
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    expect(sharedBuildCount).toBe(0);
    expect(publicBuildCount).toBe(0);
    expect(commissionByTier).toEqual([]);
  });

  it("counts a build started just after midnight on a Monday in Nepal in that Monday's week", async () => {
    const mondayJustAfterMidnightInNepal = new Date("2026-09-27T18:30:00.000Z");
    const thatMondayInNepal = "2026-09-28T00:00:00.000Z";
    const weekBefore = new Date("2026-09-20T00:00:00.000Z");
    const outfitId = await startBuildOrFail(await createOutfitUser("Sita Rai"));
    await prisma.outfit.update({
      where: { id: outfitId },
      data: { createdAt: mondayJustAfterMidnightInNepal },
    });

    const weeklyStarts = await outfitAdminRepository.buildStartsByWeek(weekBefore);

    expect(weeklyStarts.map(({ week_start }) => week_start.toISOString())).toEqual([
      thatMondayInNepal,
    ]);
  });
});
