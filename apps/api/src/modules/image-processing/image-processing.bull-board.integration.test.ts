import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const QUEUE_DASHBOARD_PATH = "/internal/queues";

const createAccountWithRole = async (role: UserRole) => {
  const suffix = randomUUID().slice(0, 8);
  const account = await prisma.user.create({
    data: {
      email: `queue-${role.toLowerCase()}-${suffix}@outfiqe.test`,
      name: "Queue Dashboard Tester",
      handle: `queue-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
  const { accessToken } = generateTokenpair({ sub: account.id, role });
  return `Bearer ${accessToken}`;
};

describe("the internal queue dashboard", () => {
  it("rejects a request with no credentials", async () => {
    const response = await request(testApp).get(QUEUE_DASHBOARD_PATH);

    expect(response.status).toBe(401);
  });

  it("rejects tenant staff, who must never see platform-wide job data", async () => {
    const authorization = await createAccountWithRole(UserRole.TENANT_STAFF);

    const response = await request(testApp)
      .get(QUEUE_DASHBOARD_PATH)
      .set("Authorization", authorization);

    expect(response.status).toBe(403);
  });

  it("rejects shoppers", async () => {
    const authorization = await createAccountWithRole(UserRole.CUSTOMER);

    const response = await request(testApp)
      .get(QUEUE_DASHBOARD_PATH)
      .set("Authorization", authorization);

    expect(response.status).toBe(403);
  });

  it("rejects platform staff who are not co-founders, whatever permissions their role holds", async () => {
    const platformAdmin = await createAdminSession();

    const response = await request(testApp)
      .get(QUEUE_DASHBOARD_PATH)
      .set("Authorization", platformAdmin.authHeader);

    expect(response.status).toBe(403);
  });

  it("lets a co-founder through", async () => {
    const coFounder = await createAdminSession();
    const platformOrganization = await crmAccessRepository.findPlatformOrganization();
    await prisma.membership.update({
      where: {
        userId_organizationId: {
          userId: coFounder.userId,
          organizationId: platformOrganization!.id,
        },
      },
      data: { isPlatformSuperAdmin: true },
    });

    const response = await request(testApp)
      .get(QUEUE_DASHBOARD_PATH)
      .set("Authorization", coFounder.authHeader);

    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });
});
