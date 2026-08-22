import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { CreatorStatus, UserRole } from "#generated/prisma/enums.js";
import { slugifyHandle, withHandleSuffix } from "#lib/handle.utils.js";
import type { DbClient } from "#types/db.types.js";

import type { CreateUserInput, UpdateUserProfileInput, UserRecord } from "./user.types.js";

const MAX_HANDLE_ATTEMPTS = 5;

const createWithUniqueHandle = async (
  client: DbClient,
  userData: Omit<Parameters<typeof prisma.user.create>[0]["data"], "handle">,
  name: string,
): Promise<UserRecord> => {
  const base = slugifyHandle(name);

  for (let attempt = 0; attempt < MAX_HANDLE_ATTEMPTS; attempt++) {
    const handle = attempt === 0 ? base : withHandleSuffix(base);
    try {
      return await client.user.create({ data: { ...userData, handle } });
    } catch (error) {
      const isHandleCollision = error instanceof Error && "code" in error && error.code === "P2002";
      if (!isHandleCollision || attempt === MAX_HANDLE_ATTEMPTS - 1) throw error;
    }
  }

  throw new Error("unreachable");
};

export const userRepository = {
  async create(
    input: CreateUserInput & { passwordHash: string },
    client: DbClient = prisma,
  ): Promise<UserRecord> {
    return createWithUniqueHandle(
      client,
      {
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash: input.passwordHash,
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.emailVerified !== undefined ? { emailVerified: input.emailVerified } : {}),
      },
      input.name,
    );
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findByPhone(phone: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { phone } });
  },

  async findById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findByHandle(handle: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { handle } });
  },

  async findManyByIds(ids: string[], q?: string): Promise<UserRecord[]> {
    if (ids.length === 0) return [];
    return prisma.user.findMany({
      where: {
        id: { in: ids },
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { handle: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    });
  },

  async list(): Promise<UserRecord[]> {
    return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  },

  async findIdsByRole(role: UserRole): Promise<string[]> {
    const rows = await prisma.user.findMany({ where: { role }, select: { id: true } });
    return rows.map((row) => row.id);
  },

  async markEmailVerified(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { emailVerified: true } });
  },

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  async updateProfile(id: string, profileInput: UpdateUserProfileInput): Promise<UserRecord> {
    return prisma.user.update({ where: { id }, data: profileInput });
  },

  async updateCreatorStatus(
    id: string,
    creatorStatusUpdate: {
      creatorStatus: CreatorStatus;
      isCreator?: boolean;
      creatorApprovedAt?: Date;
    },
  ): Promise<UserRecord> {
    return prisma.user.update({ where: { id }, data: creatorStatusUpdate });
  },

  async searchCreatorIds(
    query: string,
    { limit, offset }: { limit: number; offset: number },
  ): Promise<{ ids: string[]; total: number }> {
    const rows = await prisma.$queryRaw<{ id: string; total_count: bigint }[]>(Prisma.sql`
      SELECT id, total_count FROM search_creators(${query}, ${limit}, ${offset})
    `);

    const [first] = rows;
    return { ids: rows.map((row) => row.id), total: first ? Number(first.total_count) : 0 };
  },

  async listByCreatorStatus(
    status: CreatorStatus | undefined,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<UserRecord[]> {
    return prisma.user.findMany({
      where: status ? { creatorStatus: status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
  },
};
