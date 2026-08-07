import { prisma } from "../../shared/db/prisma.js";
import type { CreateUserInput, UserRecord } from "./user.types.js";

// The only file that knows how users are persisted. Swapping Postgres for
// something else, or extracting a standalone "users service" later, means
// changing this file and nothing above it.
export const userRepository = {
  async create(input: CreateUserInput & { passwordHash: string }): Promise<UserRecord> {
    return prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: input.passwordHash,
      },
    });
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  async findById(id: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async list(): Promise<UserRecord[]> {
    return prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  },
};
