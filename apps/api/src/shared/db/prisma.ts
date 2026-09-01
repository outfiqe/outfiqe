import { PrismaPg } from "@prisma/adapter-pg";

import { env } from "#config/env.config.js";
import { PrismaClient } from "#generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});

export const prisma = new PrismaClient({ adapter });

const readReplicaConnectionString = process.env.DATABASE_READ_URL?.trim();

const buildReadReplicaClient = (): PrismaClient =>
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: readReplicaConnectionString,
      max: env.DATABASE_POOL_MAX,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    }),
  });

export const prismaRead: PrismaClient = readReplicaConnectionString
  ? buildReadReplicaClient()
  : prisma;

export const disconnectDb = async () => {
  await prisma.$disconnect();
  if (prismaRead !== prisma) await prismaRead.$disconnect();
};
