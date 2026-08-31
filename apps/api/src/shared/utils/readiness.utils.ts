import { prisma } from "#db/prisma.js";
import { redis } from "#redis/redis.client.js";

export const checkReadiness = async (): Promise<void> => {
  await Promise.all([prisma.$queryRaw`SELECT 1`, redis.ping()]);
};
