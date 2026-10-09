import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { redis } from "#redis/redis.client.js";
import { createOutfitUser } from "#test/integration/outfitFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const CHECKOUTS_ALLOWED_PER_MINUTE = 5;

beforeEach(async () => {
  await redis.flushdb();
});

describe("checkout rate limit", () => {
  it("lets a shopper try checkout five times a minute, then asks them to wait", async () => {
    const shopper = await createOutfitUser("Sita");
    const attemptCheckout = () =>
      request(testApp).post("/api/orders/checkout").set("Authorization", shopper.auth).send({});

    for (let attempt = 0; attempt < CHECKOUTS_ALLOWED_PER_MINUTE; attempt += 1) {
      expect((await attemptCheckout()).status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }
    const overTheLimit = await attemptCheckout();

    expect(overTheLimit.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
  });

  it("counts each shopper separately", async () => {
    const busyShopper = await createOutfitUser("Ram");
    const otherShopper = await createOutfitUser("Gita");
    for (let attempt = 0; attempt <= CHECKOUTS_ALLOWED_PER_MINUTE; attempt += 1) {
      await request(testApp)
        .post("/api/orders/checkout")
        .set("Authorization", busyShopper.auth)
        .send({});
    }

    const otherAttempt = await request(testApp)
      .post("/api/orders/checkout")
      .set("Authorization", otherShopper.auth)
      .send({});

    expect(otherAttempt.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
  });
});
