import { randomUUID } from "node:crypto";

import { subHours } from "date-fns/subHours";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  ContentReportReason,
  ContentReportTarget,
  FeatureFlagRollout,
  ImageProcessingPriorityTier,
  ImageProcessingQualityTier,
  ImageProcessingStatus,
  OutfitPhotoKind,
  OutfitPhotoStatus,
  OutfitVisibility,
} from "#generated/prisma/enums.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/authHelpers.js";
import { REAL_BROWSER_UA } from "#test/integration/browserUserAgent.js";
import {
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

import { runOutfitPhotoCleanupSweep } from "./outfit-photo.service.js";

const CONCURRENT_ATTEMPTS = 6;
const HOURS_PAST_CLEANUP = 25;

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await setFeatureFlagRollout("outfit_photos", FeatureFlagRollout.EVERYONE);
  await setFeatureFlagRollout("outfit_try_on", FeatureFlagRollout.OFF);
  await seedOutfitSlotTypes();
});

const createUploadedAsset = async (
  owner: OutfitTestUser,
  status: ImageProcessingStatus = ImageProcessingStatus.COMPLETED,
) => {
  const asset = await prisma.imageProcessingAsset.create({
    data: {
      ownerId: owner.id,
      checksum: randomUUID(),
      priorityTier: ImageProcessingPriorityTier.STANDARD,
      qualityTier: ImageProcessingQualityTier.STANDARD,
      tempStorageKey: `${randomUUID()}.jpg`,
      status,
    },
  });
  return { imageAssetId: asset.id, imageUrl: `https://cdn.outfiqe.test/uploads/${asset.id}.jpg` };
};

const addPhotos = async (
  caller: OutfitTestUser,
  outfitId: string,
  photos: { imageAssetId: string; imageUrl: string }[],
  kind: OutfitPhotoKind = OutfitPhotoKind.COVER,
) =>
  writeToBuild(caller, "post", `/${outfitId}/photos`, await currentBuildVersion(outfitId), {
    kind,
    photos,
  });

const buildWithEditor = async () => {
  const owner = await createOutfitUser("Sita");
  const editor = await createOutfitUser("Ram");
  const outfitId = await startBuildOrFail(owner);
  const added = await writeToBuild(
    owner,
    "post",
    `/${outfitId}/members`,
    await currentBuildVersion(outfitId),
    { userIds: [editor.id] },
  );
  expect(added.status).toBe(HTTP_STATUS.OK);
  return { owner, editor, outfitId };
};

describe("adding build photos", () => {
  it("adds the uploader's own photos and shows them on the board with the photo limits", async () => {
    const { owner, outfitId } = await buildWithEditor();
    const photo = await createUploadedAsset(owner);

    const response = await addPhotos(owner, outfitId, [photo]);

    expect(response.status).toBe(HTTP_STATUS.OK);
    const { photos, limits } = response.body.data.board;
    expect(photos).toHaveLength(1);
    expect(photos[0]).toMatchObject({
      kind: OutfitPhotoKind.COVER,
      status: OutfitPhotoStatus.READY,
      coverPosition: null,
      uploadedBy: { id: owner.id, name: "Sita" },
    });
    expect(photos[0].image.url).toBe(photo.imageUrl);
    expect(limits).toMatchObject({
      maxPhotosPerMember: 5,
      maxPhotosPerBoard: 15,
      maxCoverPhotos: 6,
    });
  });

  it("refuses someone else's upload, a reused upload, and a photo from a non-member", async () => {
    const { owner, editor, outfitId } = await buildWithEditor();
    const editorsPhoto = await createUploadedAsset(editor);
    const outsider = await createOutfitUser("Hari");

    const someoneElses = await addPhotos(owner, outfitId, [editorsPhoto]);
    expect(someoneElses.status).toBe(HTTP_STATUS.NOT_FOUND);

    expect((await addPhotos(editor, outfitId, [editorsPhoto])).status).toBe(HTTP_STATUS.OK);
    const reused = await addPhotos(editor, outfitId, [editorsPhoto]);
    expect(reused.status).toBe(HTTP_STATUS.CONFLICT);
    expect(reused.body.code).toBe("PHOTO_ALREADY_ADDED");

    const fromOutsider = await addPhotos(outsider, outfitId, [await createUploadedAsset(outsider)]);
    expect(fromOutsider.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it("keeps each person and the whole board within their photo limits", async () => {
    await overrideOutfitSetting("outfit.maxPhotosPerMember", 2);
    await overrideOutfitSetting("outfit.maxPhotosPerBoard", 3);
    const { owner, editor, outfitId } = await buildWithEditor();

    const tooMany = await addPhotos(owner, outfitId, [
      await createUploadedAsset(owner),
      await createUploadedAsset(owner),
      await createUploadedAsset(owner),
    ]);
    expect(tooMany.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(tooMany.body.code).toBe("MEMBER_PHOTO_LIMIT_REACHED");

    await addPhotos(owner, outfitId, [
      await createUploadedAsset(owner),
      await createUploadedAsset(owner),
    ]);
    const boardFull = await addPhotos(editor, outfitId, [
      await createUploadedAsset(editor),
      await createUploadedAsset(editor),
    ]);
    expect(boardFull.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(boardFull.body.code).toBe("BOARD_PHOTO_LIMIT_REACHED");
  });

  it("lets only one of several photo adds sent at the same moment through, so limits can't be raced", async () => {
    const { owner, outfitId } = await buildWithEditor();
    const version = await currentBuildVersion(outfitId);
    const uploads = await Promise.all(
      Array.from({ length: CONCURRENT_ATTEMPTS }, () => createUploadedAsset(owner)),
    );

    await Promise.all(
      uploads.map((upload) =>
        writeToBuild(owner, "post", `/${outfitId}/photos`, version, {
          kind: OutfitPhotoKind.COVER,
          photos: [upload],
        }),
      ),
    );

    const savedPhotoCount = await prisma.outfitPhoto.count({ where: { outfitId } });
    expect(savedPhotoCount).toBe(1);
  });

  it("refuses try-on photos while the try-on switch is off, and takes them once it is on", async () => {
    const { owner, outfitId } = await buildWithEditor();

    const whileOff = await addPhotos(
      owner,
      outfitId,
      [await createUploadedAsset(owner)],
      OutfitPhotoKind.TRY_ON,
    );
    expect(whileOff.status).toBe(HTTP_STATUS.NOT_FOUND);

    await setFeatureFlagRollout("outfit_try_on", FeatureFlagRollout.EVERYONE);
    const whileOn = await addPhotos(
      owner,
      outfitId,
      [await createUploadedAsset(owner)],
      OutfitPhotoKind.TRY_ON,
    );
    expect(whileOn.status).toBe(HTTP_STATUS.OK);
  });

  it("refuses every photo route while build photos are switched off", async () => {
    await setFeatureFlagRollout("outfit_photos", FeatureFlagRollout.OFF);
    const { owner, outfitId } = await buildWithEditor();

    const response = await addPhotos(owner, outfitId, [await createUploadedAsset(owner)]);

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});

describe("removing photos and picking covers", () => {
  it("lets the uploader or the owner remove a photo, but not another editor", async () => {
    const owner = await createOutfitUser("Sita");
    const firstEditor = await createOutfitUser("Ram");
    const secondEditor = await createOutfitUser("Gita");
    const outfitId = await startBuildOrFail(owner);
    await writeToBuild(owner, "post", `/${outfitId}/members`, await currentBuildVersion(outfitId), {
      userIds: [firstEditor.id, secondEditor.id],
    });
    const added = await addPhotos(firstEditor, outfitId, [await createUploadedAsset(firstEditor)]);
    const [photo] = added.body.data.board.photos;

    const byOtherEditor = await writeToBuild(
      secondEditor,
      "delete",
      `/${outfitId}/photos/${photo.id}`,
      await currentBuildVersion(outfitId),
    );
    expect(byOtherEditor.status).toBe(HTTP_STATUS.FORBIDDEN);

    const byOwner = await writeToBuild(
      owner,
      "delete",
      `/${outfitId}/photos/${photo.id}`,
      await currentBuildVersion(outfitId),
    );
    expect(byOwner.status).toBe(HTTP_STATUS.OK);
    expect(byOwner.body.data.board.photos).toHaveLength(0);
    const removed = await prisma.outfitPhoto.findUniqueOrThrow({ where: { id: photo.id } });
    expect(removed).toMatchObject({ status: OutfitPhotoStatus.REMOVED, removedById: owner.id });
  });

  it("lets only the owner pick build photos as covers, in order, up to the limit", async () => {
    await overrideOutfitSetting("outfit.maxCoverPhotos", 2);
    await setFeatureFlagRollout("outfit_try_on", FeatureFlagRollout.EVERYONE);
    const { owner, editor, outfitId } = await buildWithEditor();
    const added = await addPhotos(owner, outfitId, [
      await createUploadedAsset(owner),
      await createUploadedAsset(owner),
      await createUploadedAsset(owner),
    ]);
    const [first, second, third] = added.body.data.board.photos;
    const tryOn = await addPhotos(
      owner,
      outfitId,
      [await createUploadedAsset(owner)],
      OutfitPhotoKind.TRY_ON,
    );
    const tryOnPhoto = tryOn.body.data.board.photos.find(
      ({ kind }: { kind: OutfitPhotoKind }) => kind === OutfitPhotoKind.TRY_ON,
    );
    const setCovers = async (caller: OutfitTestUser, photoIds: string[]) =>
      writeToBuild(caller, "put", `/${outfitId}/covers`, await currentBuildVersion(outfitId), {
        photoIds,
      });

    expect((await setCovers(editor, [first.id])).status).toBe(HTTP_STATUS.FORBIDDEN);
    expect((await setCovers(owner, [first.id, second.id, third.id])).body.code).toBe(
      "TOO_MANY_COVERS",
    );
    expect((await setCovers(owner, [tryOnPhoto.id])).body.code).toBe("COVER_NOT_ELIGIBLE");

    const picked = await setCovers(owner, [second.id, first.id]);
    expect(picked.status).toBe(HTTP_STATUS.OK);
    const coverPositions = Object.fromEntries(
      picked.body.data.board.photos.map(
        ({ id, coverPosition }: { id: string; coverPosition: number | null }) => [
          id,
          coverPosition,
        ],
      ),
    );
    expect(coverPositions).toMatchObject({ [second.id]: 0, [first.id]: 1, [third.id]: null });

    const repicked = await setCovers(owner, [third.id]);
    expect(repicked.status).toBe(HTTP_STATUS.OK);
    expect(
      await prisma.outfitPhoto.count({ where: { outfitId, coverPosition: { not: null } } }),
    ).toBe(1);
  });
});

describe("covers on cards and reported photos", () => {
  it("shows covers on My Builds, and a moderator can remove a reported photo on a shared build", async () => {
    const { owner, outfitId } = await buildWithEditor();
    const added = await addPhotos(owner, outfitId, [await createUploadedAsset(owner)]);
    const [photo] = added.body.data.board.photos;
    await writeToBuild(owner, "put", `/${outfitId}/covers`, await currentBuildVersion(outfitId), {
      photoIds: [photo.id],
    });

    const myBuilds = await request(testApp).get("/api/outfits").set("Authorization", owner.auth);
    expect(myBuilds.body.data.items[0].coverPhotos).toEqual([
      { id: photo.id, image: expect.objectContaining({ url: photo.image.url }) },
    ]);

    await prisma.outfit.update({
      where: { id: outfitId },
      data: { visibility: OutfitVisibility.SHARED },
    });
    const reporter = await createOutfitUser("Hari");
    const report = await request(testApp)
      .post("/api/content-reports")
      .set("Authorization", reporter.auth)
      .set("User-Agent", REAL_BROWSER_UA)
      .send({
        targetType: ContentReportTarget.OUTFIT_PHOTO,
        targetId: photo.id,
        reason: ContentReportReason.SPAM,
      });
    expect(report.status).toBeLessThan(300);
    const { id: reportId } = await prisma.contentReport.findFirstOrThrow({
      where: { targetId: photo.id },
    });

    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:content:moderate",
    );
    const resolved = await request(testApp)
      .post(`/api/content-reports/${reportId}/resolve`)
      .set("Authorization", authHeader)
      .send({ action: "REMOVE_CONTENT" });
    expect(resolved.status).toBe(HTTP_STATUS.OK);

    const board = await readBuild(owner, outfitId);
    expect(board.body.data.photos).toHaveLength(0);
    const removedPhoto = await prisma.outfitPhoto.findUniqueOrThrow({ where: { id: photo.id } });
    expect(removedPhoto.coverPosition).toBeNull();
  });
});

describe("runOutfitPhotoCleanupSweep", () => {
  it("marks processed photos ready and cleans up ones that never finished after a day", async () => {
    const { owner, outfitId } = await buildWithEditor();
    const stillProcessing = await createUploadedAsset(owner, ImageProcessingStatus.PENDING);
    const failed = await createUploadedAsset(owner, ImageProcessingStatus.PENDING);
    const abandoned = await createUploadedAsset(owner, ImageProcessingStatus.PENDING);
    await addPhotos(owner, outfitId, [stillProcessing, failed, abandoned]);
    await prisma.imageProcessingAsset.update({
      where: { id: stillProcessing.imageAssetId },
      data: { status: ImageProcessingStatus.COMPLETED },
    });
    await prisma.imageProcessingAsset.update({
      where: { id: failed.imageAssetId },
      data: { status: ImageProcessingStatus.FAILED },
    });
    await prisma.outfitPhoto.update({
      where: { imageAssetId: abandoned.imageAssetId },
      data: { createdAt: subHours(new Date(), HOURS_PAST_CLEANUP) },
    });

    await runOutfitPhotoCleanupSweep();

    const statusOf = async (imageAssetId: string) =>
      (await prisma.outfitPhoto.findUniqueOrThrow({ where: { imageAssetId } })).status;
    expect(await statusOf(stillProcessing.imageAssetId)).toBe(OutfitPhotoStatus.READY);
    expect(await statusOf(failed.imageAssetId)).toBe(OutfitPhotoStatus.REMOVED);
    expect(await statusOf(abandoned.imageAssetId)).toBe(OutfitPhotoStatus.REMOVED);
  });
});
