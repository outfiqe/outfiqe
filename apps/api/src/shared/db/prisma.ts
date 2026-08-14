import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "#config/env.config.js";
import { PrismaClient } from "#generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});

export const prisma = new PrismaClient({ adapter });

export const disconnectDb = async () => {
  await prisma.$disconnect();
};
