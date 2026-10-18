import { BAG_TAG_CODE_LENGTH, isCrockfordCode } from "@outfiqe/utils";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/auth-helpers.js";
import { createHub } from "#test/integration/logistics-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const BATCHES_PATH = "/api/logistics/admin/bag-tag-batches";
const TAG_COUNT = 12;
const NO_TAGS_USED = 0;

beforeEach(async () => {
  await redis.flushdb();
});

describe("bag sticker batches", () => {
  it("creates a batch of unique sticker codes and lists it", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );
    const hub = await createHub();

    const created = await request(testApp)
      .post(BATCHES_PATH)
      .set("Authorization", authHeader)
      .send({ hubId: hub.id, tagCount: TAG_COUNT });

    expect(created.status).toBe(201);
    const codes: string[] = created.body.data.tags.map((tag: { code: string }) => tag.code);
    expect(new Set(codes).size).toBe(TAG_COUNT);
    expect(codes.every((code) => isCrockfordCode(code, BAG_TAG_CODE_LENGTH))).toBe(true);

    const listed = await request(testApp)
      .get(BATCHES_PATH)
      .query({ hubId: hub.id })
      .set("Authorization", authHeader);
    expect(listed.body.data.items).toEqual([
      expect.objectContaining({ tagCount: TAG_COUNT, usedTagCount: NO_TAGS_USED }),
    ]);

    const sheet = await request(testApp)
      .get(`${BATCHES_PATH}/${created.body.data.id}`)
      .set("Authorization", authHeader);
    expect(sheet.body.data.tags).toHaveLength(TAG_COUNT);
  });

  it("refuses a closed hub", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );
    const hub = await createHub();
    await prisma.hub.update({ where: { id: hub.id }, data: { isActive: false } });

    const response = await request(testApp)
      .post(BATCHES_PATH)
      .set("Authorization", authHeader)
      .send({ hubId: hub.id, tagCount: TAG_COUNT });

    expect(response.status).toBe(404);
  });
});
