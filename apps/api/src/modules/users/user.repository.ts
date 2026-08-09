import { prisma } from "../../shared/db/prisma.js";
import type { CreatorStatus } from "../../generated/prisma/enums.js";
import type { CreateUserInput, UserRecord } from "./user.types.js";

export const userRepository = {
  async create(input: CreateUserInput & { passwordHash: string }): Promise<UserRecord> {
    return prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        passwordHash: input.passwordHash,
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.emailVerified !== undefined ? { emailVerified: input.emailVerified } : {}),
      },
    });
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

  async list(): Promise<UserRecord[]> {
    return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  },

  async markEmailVerified(id: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { emailVerified: true } });
  },

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  },

  async updateCreatorStatus(
    id: string,
    data: { creatorStatus: CreatorStatus; isCreator?: boolean },
  ): Promise<UserRecord> {
    return prisma.user.update({ where: { id }, data });
  },

  async listByCreatorStatus(status?: CreatorStatus): Promise<UserRecord[]> {
    return prisma.user.findMany({
      where: status ? { creatorStatus: status } : undefined,
      orderBy: { createdAt: "desc" },
    });
  },
};
