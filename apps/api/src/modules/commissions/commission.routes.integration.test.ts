import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { createAdminSession, grantPlatformPermissions } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";

const createCommissionsAdmin = async () => {
  const admin = await createAdminSession();
  await grantPlatformPermissions(admin.userId, "platform:commissions:manage");
  return admin;
};

const validTierBody = () => ({
  minPrice: 0,
  maxPrice: 5_000,
  amount: 100,
});

describe("POST /api/commissions/tiers", () => {
  it("creates a commission tier for a platform staffer with platform:commissions:manage", async () => {
    const { authHeader } = await createCommissionsAdmin();

    const response = await request(testApp)
      .post("/api/commissions/tiers")
      .set("Authorization", authHeader)
      .send(validTierBody());

    expect(response.status).toBe(201);
    expect(response.body.data.amount).toBe(100);
  });

  it("blocks a platform staffer without platform:commissions:manage", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .post("/api/commissions/tiers")
      .set("Authorization", authHeader)
      .send(validTierBody());

    expect(response.status).toBe(403);
  });
});

describe("commission review mutations", () => {
  it("blocks approve, void, and mark-paid for a platform staffer without platform:commissions:manage", async () => {
    const { authHeader } = await createAdminSession();
    const commissionId = randomUUID();

    const approve = await request(testApp)
      .post(`/api/commissions/${commissionId}/approve`)
      .set("Authorization", authHeader);
    expect(approve.status).toBe(403);

    const voidResponse = await request(testApp)
      .post(`/api/commissions/${commissionId}/void`)
      .set("Authorization", authHeader)
      .send({ reason: "Duplicate entry." });
    expect(voidResponse.status).toBe(403);

    const markPaid = await request(testApp)
      .post(`/api/commissions/${commissionId}/mark-paid`)
      .set("Authorization", authHeader);
    expect(markPaid.status).toBe(403);
  });

  it("lets a staffer with platform:commissions:manage reach the underlying business logic", async () => {
    const { authHeader } = await createCommissionsAdmin();
    const commissionId = randomUUID();

    const approve = await request(testApp)
      .post(`/api/commissions/${commissionId}/approve`)
      .set("Authorization", authHeader);
    expect(approve.status).toBe(409);
    expect(approve.body.code).toBe("INVALID_TRANSITION");
  });
});
