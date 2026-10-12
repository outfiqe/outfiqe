import { prisma } from "#db/prisma.js";

export const outfitPublishRepository = {
  async findLookFromVersion(creatorId: string, outfitId: string, outfitVersion: number) {
    return prisma.creatorLook.findFirst({
      where: { creatorId, sourceOutfitId: outfitId, sourceOutfitVersion: outfitVersion },
      select: { id: true, deletedAt: true },
    });
  },

  async findLatestLookBy(
    creatorId: string,
    outfitId: string,
  ): Promise<{ id: string; sourceOutfitVersion: number } | null> {
    const latestLook = await prisma.creatorLook.findFirst({
      where: {
        creatorId,
        sourceOutfitId: outfitId,
        sourceOutfitVersion: { not: null },
        deletedAt: null,
      },
      orderBy: { sourceOutfitVersion: "desc" },
      select: { id: true, sourceOutfitVersion: true },
    });
    if (!latestLook || latestLook.sourceOutfitVersion === null) return null;
    return { id: latestLook.id, sourceOutfitVersion: latestLook.sourceOutfitVersion };
  },

  async listCreatorsWithOlderLooks(outfitId: string, lockedVersion: number): Promise<string[]> {
    const olderLooks = await prisma.creatorLook.findMany({
      where: {
        sourceOutfitId: outfitId,
        sourceOutfitVersion: { lt: lockedVersion },
        deletedAt: null,
      },
      distinct: ["creatorId"],
      select: { creatorId: true },
    });
    return olderLooks.map(({ creatorId }) => creatorId);
  },
};
