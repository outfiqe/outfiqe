import "../src/config/load-env.js";

import { UserRole } from "../src/generated/prisma/enums.js";
import { prisma } from "../src/shared/db/prisma.js";
import { hashPassword } from "../src/shared/utils/password.utils.js";
import { platformCoFounderEmails, seedPlatformCrm } from "./seed-crm.js";

const coFounderPassword = process.env.PLATFORM_CO_FOUNDER_PASSWORD?.trim();

const handleFor = (email: string) =>
  email
    .split("@")[0]!
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();

const displayNameFor = (email: string) =>
  email
    .split("@")[0]!
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

async function upsertCoFounderAccount(email: string, passwordHash: string) {
  await prisma.user.upsert({
    where: { email },
    update: { role: UserRole.ADMIN, emailVerified: true, passwordHash },
    create: {
      email,
      name: displayNameFor(email),
      handle: handleFor(email),
      passwordHash,
      role: UserRole.ADMIN,
      emailVerified: true,
    },
  });
}

async function main() {
  if (!coFounderPassword) {
    throw new Error(
      "Set PLATFORM_CO_FOUNDER_PASSWORD before running — it is the initial password for every " +
        "seeded co-founder account. Rotate it (or have each co-founder use the password-reset " +
        "flow) straight after.",
    );
  }

  const emails = platformCoFounderEmails();
  const passwordHash = await hashPassword(coFounderPassword);

  for (const email of emails) {
    await upsertCoFounderAccount(email, passwordHash);
  }

  await seedPlatformCrm();

  const platformOrganization = await prisma.organization.findFirst({
    where: { isPlatformOrg: true },
    select: { id: true },
  });
  const coFounderMemberships = platformOrganization
    ? await prisma.membership.findMany({
        where: {
          organizationId: platformOrganization.id,
          isPlatformSuperAdmin: true,
          status: "ACTIVE",
        },
        select: { user: { select: { email: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  console.warn("\nCo-founder accounts ready:");
  for (const email of emails) {
    const isCoFounder = coFounderMemberships.some((membership) => membership.user.email === email);
    console.warn(`  ${isCoFounder ? "✓ co-founder" : "· pending "}  ${email}`);
  }
  console.warn(
    "\nEvery account above now signs in with PLATFORM_CO_FOUNDER_PASSWORD. Rotate it now.\n",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
