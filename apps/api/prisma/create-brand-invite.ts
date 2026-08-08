import { randomUUID } from "node:crypto";

import { prisma } from "../src/shared/db/prisma.js";
import { sendEmail } from "../src/shared/utils/email.utils.js";
import { generateOpaqueToken, hashToken } from "../src/shared/utils/opaque-token.utils.js";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function main() {
  const applicationId = process.argv[2];

  if (!applicationId) {
    console.error("Usage: pnpm --filter @outfiqe/api create-invite <applicationId>");
    process.exitCode = 1;
    return;
  }

  const application = await prisma.brandApplication.findUnique({ where: { id: applicationId } });
  if (!application) {
    console.error(`No brand application found with id ${applicationId}`);
    process.exitCode = 1;
    return;
  }

  const existingUser = await prisma.user.findUnique({ where: { email: application.email } });
  if (existingUser) {
    console.error(`${application.email} already has an account.`);
    process.exitCode = 1;
    return;
  }

  const rawToken = generateOpaqueToken();

  await prisma.brandInvite.create({
    data: {
      brandId: randomUUID(),
      brandName: application.brandName,
      email: application.email,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
    },
  });

  const inviteUrl = `http://localhost:3000/register/brand?token=${rawToken}`;

  await sendEmail({
    to: application.email,
    subject: `You're approved — set up ${application.brandName} on Outfiqe`,
    body: `${application.brandName} is approved. Set up your account: ${inviteUrl}`,
  });

  console.log(`Invite created for ${application.brandName} (${application.email})`);
  console.log(inviteUrl);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
