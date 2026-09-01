import "../src/config/load-env.js";

import { prisma } from "../src/shared/db/prisma.js";
import { seedPlatformCrm } from "./seed-crm.js";

async function main() {
  await seedPlatformCrm();

  const platformOrganization = await prisma.organization.findFirst({
    where: { isPlatformOrg: true },
  });
  if (!platformOrganization) {
    throw new Error("Platform organization was not created.");
  }

  const superAdminMembership = platformOrganization.superAdminMembershipId
    ? await prisma.membership.findUnique({
        where: { id: platformOrganization.superAdminMembershipId },
        include: { user: { select: { email: true } } },
      })
    : null;

  console.warn("\nPlatform CRM ready:");
  console.warn(`  organization: ${platformOrganization.name} (${platformOrganization.subdomain})`);
  console.warn(
    superAdminMembership
      ? `  superadmin:   ${superAdminMembership.user.email}`
      : "  superadmin:   not assigned yet — create a platform admin account, then re-run",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
