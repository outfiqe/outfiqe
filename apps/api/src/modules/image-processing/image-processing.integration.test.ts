import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  ImageProcessingPriorityTier,
  ImageProcessingQualityTier,
  ImageProcessingStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { imageOutputStorageAdapter } from "./image-processing.storage.js";

const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const tinyPngBuffer = Buffer.from(TINY_PNG_BASE64, "base64");

beforeEach(async () => {
  await redis.flushdb();
});

const createUser = async (
  overrides: Partial<Parameters<typeof prisma.user.create>[0]["data"]> = {},
) =>
  prisma.user.create({
    data: {
      email: `${randomUUID()}@outfiqe.test`,
      name: "Test User",
      handle: `test-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      ...overrides,
    },
  });

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

describe("POST /api/image-processing", () => {
  it("rejects an unauthenticated upload", async () => {
    const response = await request(testApp)
      .post("/api/image-processing")
      .attach("file", tinyPngBuffer, "photo.png");

    expect(response.status).toBe(401);
  });

  it("rejects a disallowed file type", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .post("/api/image-processing")
      .set("Authorization", authHeaderFor(user.id))
      .attach("file", Buffer.from("not an image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(response.status).toBe(422);
  });

  it("accepts a valid image, persists it, and queues it for processing", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .post("/api/image-processing")
      .set("Authorization", authHeaderFor(user.id))
      .attach("file", tinyPngBuffer, "photo.png");

    const { status: httpStatus, body } = response;
    const { asset } = body.data;
    expect(httpStatus).toBe(202);
    expect(asset.status).toMatch(/pending|processing/);

    const { ownerId, priorityTier } = await prisma.imageProcessingAsset.findUniqueOrThrow({
      where: { id: asset.id },
    });
    expect(ownerId).toBe(user.id);
    expect(priorityTier).toBe(ImageProcessingPriorityTier.STANDARD);
  });

  it("resolves an admin uploader to the bulkAdmin priority tier", async () => {
    const admin = await createUser({ role: UserRole.ADMIN });

    const response = await request(testApp)
      .post("/api/image-processing")
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN))
      .attach("file", tinyPngBuffer, "photo.png");

    expect(response.status).toBe(202);
    const { priorityTier } = await prisma.imageProcessingAsset.findUniqueOrThrow({
      where: { id: response.body.data.asset.id },
    });
    expect(priorityTier).toBe(ImageProcessingPriorityTier.BULK_ADMIN);
  });

  it("is idempotent for the same user re-uploading identical bytes", async () => {
    const user = await createUser();

    const first = await request(testApp)
      .post("/api/image-processing")
      .set("Authorization", authHeaderFor(user.id))
      .attach("file", tinyPngBuffer, "photo.png");
    const second = await request(testApp)
      .post("/api/image-processing")
      .set("Authorization", authHeaderFor(user.id))
      .attach("file", tinyPngBuffer, "photo-again.png");

    expect(first.body.data.asset.id).toBe(second.body.data.asset.id);

    const count = await prisma.imageProcessingAsset.count({ where: { ownerId: user.id } });
    expect(count).toBe(1);
  });
});

describe("GET /api/image-processing/:assetId", () => {
  it("rejects a non-uuid assetId", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .get("/api/image-processing/not-a-uuid")
      .set("Authorization", authHeaderFor(user.id));

    expect(response.status).toBe(422);
  });

  it("returns 404 for another user's asset", async () => {
    const owner = await createUser();
    const otherUser = await createUser();
    const asset = await prisma.imageProcessingAsset.create({
      data: {
        ownerId: owner.id,
        checksum: randomUUID(),
        tempStorageKey: `temp/${randomUUID()}.png`,
        priorityTier: ImageProcessingPriorityTier.STANDARD,
        qualityTier: ImageProcessingQualityTier.STANDARD,
      },
    });

    const response = await request(testApp)
      .get(`/api/image-processing/${asset.id}`)
      .set("Authorization", authHeaderFor(otherUser.id));

    expect(response.status).toBe(404);
  });

  it("returns the asset's current status and signed variant URLs once completed", async () => {
    const owner = await createUser();
    const checksum = randomUUID();
    await imageOutputStorageAdapter.put(`variants/${checksum}/640w.jpg`, tinyPngBuffer);
    await imageOutputStorageAdapter.put(`thumbnails/${checksum}.webp`, tinyPngBuffer);
    const asset = await prisma.imageProcessingAsset.create({
      data: {
        ownerId: owner.id,
        checksum,
        tempStorageKey: `temp/${randomUUID()}.png`,
        priorityTier: ImageProcessingPriorityTier.STANDARD,
        qualityTier: ImageProcessingQualityTier.STANDARD,
        status: ImageProcessingStatus.COMPLETED,
        encodedVariants: [
          { width: 640, format: "jpeg", storageKey: `variants/${checksum}/640w.jpg`, bytes: 42 },
        ],
        thumbnailStorageKey: `thumbnails/${checksum}.webp`,
        lqip: "data:image/jpeg;base64,abc",
        optimizeCompletedAt: new Date(),
        thumbnailCompletedAt: new Date(),
      },
    });

    const response = await request(testApp)
      .get(`/api/image-processing/${asset.id}`)
      .set("Authorization", authHeaderFor(owner.id));

    const { status, variants, thumbnailUrl, lqip } = response.body.data.asset;
    expect(response.status).toBe(200);
    expect(status).toBe("completed");
    expect(variants).toHaveLength(1);
    expect(thumbnailUrl).toBeTruthy();
    expect(lqip).toBe("data:image/jpeg;base64,abc");
  });
});
