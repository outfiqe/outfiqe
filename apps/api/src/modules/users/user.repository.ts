import { prisma } from "#db/prisma.js";
import type { CreatorStatus } from "#generated/prisma/enums.js";
import { slugifyHandle, withHandleSuffix } from "#lib/handle.utils.js";

import type { CreateUserInput, UpdateUserProfileInput, UserRecord } from "./user.types.js";

const MAX_HANDLE_ATTEMPTS = 5;

// Handles aren't user-chosen yet, so collisions are rare, but retry a few times under the
// unique constraint rather than trusting a single findUnique + create isn't racy.
const createWithUniqueHandle = async (
  data: Omit<Parameters<typeof prisma.user.create>[0]["data"], "handle">,
  name: string,
): Promise<UserRecord> => {
  const base = slugifyHandle(name);

  for (let attempt = 0; attempt < MAX_HANDLE_ATTEMPTS; attempt++) {
    const handle = attempt === 0 ? base : withHandleSuffix(base);
    try {
      return await prisma.user.create({ data: { ...data, handle } });
    } catch (error) {
      const isHandleCollision = error instanceof Error && "code" in error && error.code === "P2002";
      if (!isHandleCollision || attempt === MAX_HANDLE_ATTEMPTS - 1) throw error;
    }
  }

  throw new Error("unreachable");
};

export const userRepository = {
  async create(input: CreateUserInput & { passwordHash: string }): Promise<UserRecord> {
    return createWithUniqueHandle(
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

  async list(): Promise<UserRecord[]> {
    return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  },

  async markEmailVerified(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { emailVerified: true } });
  },

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  async updateProfile(id: string, data: UpdateUserProfileInput): Promise<UserRecord> {
    return prisma.user.update({ where: { id }, data });
  },

  async updateCreatorStatus(
    id: string,
    data: { creatorStatus: CreatorStatus; isCreator?: boolean },
  ): Promise<UserRecord> {
    return prisma.user.update({ where: { id }, data });
  },

  async listByCreatorStatus(
    status: CreatorStatus | undefined,
    params: { cursor?: string; limit: number },
  ): Promise<UserRecord[]> {
    return prisma.user.findMany({
      where: status ? { creatorStatus: status } : undefined,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    });
  },
};
