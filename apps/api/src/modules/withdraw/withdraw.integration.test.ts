import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { UserRole, WithdrawOwnerType } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/test-app.js";
import {
  authHeaderFor,
  createOpenPolicy,
  createUser,
} from "#test/integration/withdraw-fixtures.js";

beforeEach(async () => {
  await redis.flushdb();
});

describe("GET /api/withdraw/policy", () => {
  it("returns the active policy for the requested ownerType", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const user = await createUser();

    const response = await request(testApp)
      .get("/api/withdraw/policy")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.ownerType).toBe("CREATOR");
    expect(response.body.data.minAmount).toBe(500);
  });

  it("bootstraps and persists a default policy instead of failing when none exists yet", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .get("/api/withdraw/policy")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.minAmount).toBe(500);
    expect(response.body.data.maxAmount).toBe(100_000);

    const persisted = await prisma.withdrawPolicy.findFirst({
      where: { ownerType: WithdrawOwnerType.CREATOR, isActive: true },
    });
    expect(persisted).not.toBeNull();
    expect(persisted?.updatedById).toBeNull();

    const secondResponse = await request(testApp)
      .get("/api/withdraw/policy")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));
    expect(secondResponse.body.data.minAmount).toBe(response.body.data.minAmount);

    const activePolicyCount = await prisma.withdrawPolicy.count({
      where: { ownerType: WithdrawOwnerType.CREATOR, isActive: true },
    });
    expect(activePolicyCount).toBe(1);
  });
});
