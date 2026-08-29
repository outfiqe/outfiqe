import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";

import { ensurePlatformOrganizationExists } from "./crmFixtures.js";

export const createAdminSession = async (): Promise<{ userId: string; authHeader: string }> => {
  const suffix = randomUUID().slice(0, 8);

  const admin = await prisma.user.create({
    data: {
      email: `admin-${suffix}@outfiqe.test`,
      name: "Test Admin",
      handle: `test-admin-${suffix}`,
      phone: `98${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });

  await ensurePlatformOrganizationExists();
  await crmAccessService.grantPlatformStaffMembership(admin.id);

  const { accessToken } = generateTokenpair({ sub: admin.id, role: UserRole.ADMIN });

  return { userId: admin.id, authHeader: `Bearer ${accessToken}` };
};
