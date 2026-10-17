import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type { PartnerStatusImportRowOutcome } from "#generated/prisma/enums.js";

const statusImportWithRows = {
  rows: { orderBy: { rowNumber: "asc" } },
} satisfies Prisma.PartnerStatusImportInclude;

export type PartnerStatusImportRecord = Prisma.PartnerStatusImportGetPayload<{
  include: typeof statusImportWithRows;
}>;

export type PartnerStatusImportRowFields = {
  rowNumber: number;
  partnerReference: string | null;
  merchantReference: string | null;
  rawStatus: string | null;
  outcome: PartnerStatusImportRowOutcome;
  message: string | null;
  trackingEventId: string | null;
};

export const logisticsPartnerStatusImportRepository = {
  async findPartnerForImport(partnerId: string) {
    return prisma.deliveryPartner.findUnique({
      where: { id: partnerId },
      select: {
        id: true,
        accounts: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { hub: { select: { timeZone: true } } },
        },
      },
    });
  },

  async createStatusImport(params: {
    partnerId: string;
    uploadedById: string;
    fileName: string;
    appliedCount: number;
    rows: readonly PartnerStatusImportRowFields[];
  }): Promise<PartnerStatusImportRecord> {
    const { rows, ...statusImport } = params;
    return prisma.partnerStatusImport.create({
      data: { ...statusImport, rowCount: rows.length, rows: { createMany: { data: [...rows] } } },
      include: statusImportWithRows,
    });
  },

  async findStatusImport(
    partnerId: string,
    importId: string,
  ): Promise<PartnerStatusImportRecord | null> {
    return prisma.partnerStatusImport.findFirst({
      where: { id: importId, partnerId },
      include: statusImportWithRows,
    });
  },
};
