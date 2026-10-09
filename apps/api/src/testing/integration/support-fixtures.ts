import { randomUUID } from "node:crypto";

import request from "supertest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";

import { seedPlatformOrganization } from "./crm-fixtures.js";
import { testApp } from "./test-app.js";

export const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) =>
  `Bearer ${generateTokenpair({ sub: userId, role }).accessToken}`;

export const createUser = (role: UserRole = UserRole.CUSTOMER) =>
  prisma.user.create({
    data: {
      email: `sup-${randomUUID()}@outfiqe.test`,
      name: "Support Person",
      handle: `sup-${randomUUID().slice(0, 12)}`,
      passwordHash: "not-used-in-tests",
      role,
    },
  });

export const seedPlatform = async () => {
  const { organization, adminRole } = await seedPlatformOrganization();
  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });
  await prisma.rolePermission.createMany({
    data: PLATFORM_PERMISSION_KEYS.map((permissionKey) => ({
      roleId: adminRole.id,
      permissionKey,
    })),
    skipDuplicates: true,
  });

  const addStaff = async () => {
    const staff = await createUser(UserRole.ADMIN);
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: staff.id,
        roleId: adminRole.id,
        status: "ACTIVE",
      },
    });
    return staff;
  };

  return { organization, addStaff };
};

export const seedSupportStaff = async () => (await seedPlatform()).addStaff();

export const createBody = (overrides: Record<string, unknown> = {}) => ({
  category: "ORDER_ISSUE",
  subject: "Where is my order?",
  message: "It has been eight days and nothing has arrived yet, please help me here.",
  ...overrides,
});

export const openTicket = async (requesterHeader: string) => {
  const response = await request(testApp)
    .post("/api/support/tickets")
    .set("Authorization", requesterHeader)
    .send(createBody());
  return response.body.data.id as string;
};

export const createTicketFixture = (overrides: Record<string, unknown> = {}) =>
  prisma.supportTicket.create({
    data: {
      requesterEmail: `reopen-${randomUUID()}@outfiqe.test`,
      requesterName: "Reopen Requester",
      category: "ORDER_ISSUE",
      subject: "Where is my order?",
      ...overrides,
    },
  });
