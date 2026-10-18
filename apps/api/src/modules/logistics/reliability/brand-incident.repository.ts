import { prisma } from "#db/prisma.js";
import type { BrandIncidentKind } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

const PAGE_LOOKAHEAD = 1;

export type BrandIncidentInput = {
  brandId: string;
  kind: BrandIncidentKind;
  sourceKey: string;
  orderId: string | null;
  note: string | null;
  occurredAt: Date;
};

export const brandIncidentRepository = {
  async recordIncidents(client: DbClient, incidents: readonly BrandIncidentInput[]) {
    await client.brandFulfilmentIncident.createMany({
      data: [...incidents],
      skipDuplicates: true,
    });
  },

  async countIncidentsSince(brandId: string, since: Date): Promise<number> {
    return prisma.brandFulfilmentIncident.count({
      where: { brandId, occurredAt: { gte: since } },
    });
  },

  async listIncidentsSince(params: {
    brandId: string;
    since: Date;
    cursor?: string;
    limit: number;
  }) {
    return prisma.brandFulfilmentIncident.findMany({
      where: { brandId: params.brandId, occurredAt: { gte: params.since } },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: params.limit + PAGE_LOOKAHEAD,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: PAGE_LOOKAHEAD } : {}),
      select: { id: true, kind: true, orderId: true, note: true, occurredAt: true },
    });
  },

  async listBrandsAtOrAbove(params: { since: Date; minimumIncidents: number; limit: number }) {
    return prisma.brandFulfilmentIncident.groupBy({
      by: ["brandId"],
      where: { occurredAt: { gte: params.since } },
      _count: { _all: true },
      having: { brandId: { _count: { gte: params.minimumIncidents } } },
      orderBy: { _count: { brandId: "desc" } },
      take: params.limit,
    });
  },

  async findBrandNames(brandIds: readonly string[]) {
    return prisma.brand.findMany({
      where: { id: { in: [...brandIds] } },
      select: { id: true, name: true },
    });
  },
};
