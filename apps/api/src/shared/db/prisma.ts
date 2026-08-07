import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../../config/env.js";
import { PrismaClient } from "../../generated/prisma/client.js";

// Prisma 7 requires an explicit driver adapter - there is no bundled
// Rust engine that opens connections for you anymore.
//
// NOTE ON POOLING: the adapter uses node-postgres' pool defaults, which
// differ from Prisma 6. `pg` has NO connection timeout by default (0),
// where Prisma 6 used 5s. The explicit values below restore sane limits.
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});

export const prisma = new PrismaClient({ adapter });

export async function disconnectDb() {
  await prisma.$disconnect();
}
