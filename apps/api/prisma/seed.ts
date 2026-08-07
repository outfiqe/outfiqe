import { hashPassword } from "../src/shared/utils/password.js";
import { prisma } from "../src/shared/db/prisma.js";

// Prisma 7 no longer runs this automatically after migrate.
// Run it explicitly with `pnpm db:seed`.
async function main() {
  const email = "demo@example.com";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Demo User",
      passwordHash: await hashPassword("demo-password-123"),
    },
  });

  console.log(`Seeded user: ${email}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
