import "../src/config/load-env.js";

import { prisma } from "../src/shared/db/prisma.js";
import { hashPassword } from "../src/shared/utils/password.utils.js";

const EMAIL = process.env.ADMIN_EMAIL ?? "admin@outfiqe.test";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "admin-password-123";
const NAME = process.env.ADMIN_NAME ?? "Platform Admin";

const handleFor = (email: string) =>
  `${email
    .split("@")[0]!
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()}-admin`;

async function main() {
  const passwordHash = await hashPassword(PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { role: "ADMIN", emailVerified: true, passwordHash },
    create: {
      email: EMAIL,
      name: NAME,
      handle: handleFor(EMAIL),
      passwordHash,
      role: "ADMIN",
      emailVerified: true,
    },
  });

  console.warn("\nAdmin account ready:");
  console.warn(`  email:    ${EMAIL}`);
  console.warn(`  password: ${PASSWORD}`);
  console.warn(`  userId:   ${admin.id}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
