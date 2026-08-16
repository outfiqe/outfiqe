import type { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";

export type DbClient = typeof prisma | Prisma.TransactionClient;
