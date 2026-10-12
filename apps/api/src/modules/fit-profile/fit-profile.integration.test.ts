import request from "supertest";
import { describe, expect, it } from "vitest";

import { createOutfitUser } from "#test/integration/outfit-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const MY_FIT_PROFILE_PATH = "/api/fit-profile/me";
const OK_STATUS = 200;
const UNAUTHORIZED_STATUS = 401;
const UNPROCESSABLE_STATUS = 422;

describe("fit profile API", () => {
  it("requires a signed-in person", async () => {
    const response = await request(testApp).get(MY_FIT_PROFILE_PATH);
    expect(response.status).toBe(UNAUTHORIZED_STATUS);
  });

  it("starts empty, saves, changes and removes a person's measurements", async () => {
    const shopper = await createOutfitUser("Sita");

    const beforeSaving = await request(testApp)
      .get(MY_FIT_PROFILE_PATH)
      .set("Authorization", shopper.auth);
    expect(beforeSaving.status).toBe(OK_STATUS);
    expect(beforeSaving.body.data).toBeNull();

    const saved = await request(testApp)
      .put(MY_FIT_PROFILE_PATH)
      .set("Authorization", shopper.auth)
      .send({ heightCm: 165, weightKg: 58 });
    expect(saved.body.data).toEqual({ heightCm: 165, weightKg: 58 });

    const changed = await request(testApp)
      .put(MY_FIT_PROFILE_PATH)
      .set("Authorization", shopper.auth)
      .send({ heightCm: 166, weightKg: 60 });
    expect(changed.body.data).toEqual({ heightCm: 166, weightKg: 60 });

    const removed = await request(testApp)
      .delete(MY_FIT_PROFILE_PATH)
      .set("Authorization", shopper.auth);
    expect(removed.status).toBe(OK_STATUS);

    const afterRemoving = await request(testApp)
      .get(MY_FIT_PROFILE_PATH)
      .set("Authorization", shopper.auth);
    expect(afterRemoving.body.data).toBeNull();
  });

  it("keeps each person's measurements to themselves", async () => {
    const shopper = await createOutfitUser("Sita");
    const otherShopper = await createOutfitUser("Ram");
    await request(testApp)
      .put(MY_FIT_PROFILE_PATH)
      .set("Authorization", shopper.auth)
      .send({ heightCm: 165, weightKg: 58 });

    const otherShoppersView = await request(testApp)
      .get(MY_FIT_PROFILE_PATH)
      .set("Authorization", otherShopper.auth);
    expect(otherShoppersView.body.data).toBeNull();
  });

  it.each([
    ["a height below 50 cm", { heightCm: 40, weightKg: 58 }],
    ["a weight above 200 kg", { heightCm: 165, weightKg: 250 }],
    ["a fractional height", { heightCm: 165.5, weightKg: 58 }],
    ["a missing weight", { heightCm: 165 }],
  ])("refuses %s", async (_description, measurements) => {
    const shopper = await createOutfitUser("Sita");
    const response = await request(testApp)
      .put(MY_FIT_PROFILE_PATH)
      .set("Authorization", shopper.auth)
      .send(measurements);
    expect(response.status).toBe(UNPROCESSABLE_STATUS);
  });
});
