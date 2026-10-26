import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { uploadBankQrImage, uploadImageWithoutQr } from "#test/integration/bank-qr-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

const PREVIEW_PATH = "/api/bank-qr-verification/preview";
const PREVIEW_MAX_REQUESTS = 30;

beforeEach(async () => {
  await redis.flushdb();
});

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return `Bearer ${accessToken}`;
};

const createUser = async () => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `bank-qr-tester-${suffix}@outfiqe.test`,
      name: "Bank QR Tester",
      handle: `bank-qr-tester-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

describe("POST /api/bank-qr-verification/preview", () => {
  it("reads the account holder name from an uploaded bank QR", async () => {
    const user = await createUser();
    const qrCodeImageUrl = await uploadBankQrImage({ accountName: "Sabin Shrestha" });

    const response = await request(testApp)
      .post(PREVIEW_PATH)
      .set("Authorization", authHeaderFor(user.id))
      .send({ qrCodeImageUrl });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data).toEqual({
      isQrDetected: true,
      accountName: "Sabin Shrestha",
      accountNumber: null,
    });
  });

  it("reports an uploaded photo with no QR code", async () => {
    const user = await createUser();
    const qrCodeImageUrl = await uploadImageWithoutQr();

    const response = await request(testApp)
      .post(PREVIEW_PATH)
      .set("Authorization", authHeaderFor(user.id))
      .send({ qrCodeImageUrl });

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.isQrDetected).toBe(false);
  });

  it("refuses an image url that is not one of our uploads", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .post(PREVIEW_PATH)
      .set("Authorization", authHeaderFor(user.id))
      .send({ qrCodeImageUrl: "https://cdn.example.com/bank-qr.png" });

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.code).toBe("BANK_QR_IMAGE_NOT_UPLOADED");
  });

  it("requires a valid url", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .post(PREVIEW_PATH)
      .set("Authorization", authHeaderFor(user.id))
      .send({ qrCodeImageUrl: "not a url" });

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
  });

  it("requires sign in", async () => {
    const response = await request(testApp)
      .post(PREVIEW_PATH)
      .send({ qrCodeImageUrl: "https://cdn.example.com/bank-qr.png" });

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });

  it("rate limits each user", async () => {
    const user = await createUser();
    const authHeader = authHeaderFor(user.id);
    const sendPreview = () =>
      request(testApp)
        .post(PREVIEW_PATH)
        .set("Authorization", authHeader)
        .send({ qrCodeImageUrl: "https://cdn.example.com/bank-qr.png" });

    for (const _attempt of Array.from({ length: PREVIEW_MAX_REQUESTS })) {
      await sendPreview();
    }
    const limitedResponse = await sendPreview();

    expect(limitedResponse.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
  });
});
