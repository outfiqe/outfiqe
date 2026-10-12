import { prisma } from "#db/prisma.js";

import type { FitProfileView } from "./fit-profile.types.js";

const fitProfileViewSelect = { heightCm: true, weightKg: true } as const;

export const fitProfileRepository = {
  async findByUserId(userId: string): Promise<FitProfileView | null> {
    return prisma.userFitProfile.findUnique({ where: { userId }, select: fitProfileViewSelect });
  },

  async upsert(userId: string, { heightCm, weightKg }: FitProfileView): Promise<FitProfileView> {
    return prisma.userFitProfile.upsert({
      where: { userId },
      create: { userId, heightCm, weightKg },
      update: { heightCm, weightKg },
      select: fitProfileViewSelect,
    });
  },

  async remove(userId: string): Promise<void> {
    await prisma.userFitProfile.deleteMany({ where: { userId } });
  },
};
