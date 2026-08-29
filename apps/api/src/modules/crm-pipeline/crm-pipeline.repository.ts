import { prisma } from "#db/prisma.js";
import type { DealStatus } from "#generated/prisma/enums.js";

import type {
  CreateDealInput,
  CreateStageInput,
  DealRecord,
  DealWithRelations,
  PipelineStageRecord,
  UpdateDealInput,
  UpdateStageInput,
} from "./crm-pipeline.types.js";

const dealWithRelationsSelect = {
  id: true,
  organizationId: true,
  stageId: true,
  title: true,
  value: true,
  currency: true,
  expectedCloseDate: true,
  ownerMembershipId: true,
  partnerCreatorId: true,
  status: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  stage: { select: { name: true } },
  partnerCreator: { select: { name: true, handle: true } },
  ownerMembership: { select: { user: { select: { name: true } } } },
} as const;

type DealJoinRow = DealRecord & {
  stage: { name: string };
  partnerCreator: { name: string; handle: string };
  ownerMembership: { user: { name: string } } | null;
};

const toDealWithRelations = (row: DealJoinRow): DealWithRelations => ({
  id: row.id,
  organizationId: row.organizationId,
  stageId: row.stageId,
  title: row.title,
  value: row.value,
  currency: row.currency,
  expectedCloseDate: row.expectedCloseDate,
  ownerMembershipId: row.ownerMembershipId,
  partnerCreatorId: row.partnerCreatorId,
  status: row.status,
  closedAt: row.closedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  stageName: row.stage.name,
  partnerName: row.partnerCreator.name,
  partnerHandle: row.partnerCreator.handle,
  ownerName: row.ownerMembership?.user.name ?? null,
});

export const crmPipelineRepository = {
  async listStages(organizationId: string): Promise<PipelineStageRecord[]> {
    return prisma.pipelineStage.findMany({
      where: { organizationId },
      orderBy: { sortOrder: "asc" },
    });
  },

  async findStage(organizationId: string, stageId: string): Promise<PipelineStageRecord | null> {
    return prisma.pipelineStage.findFirst({ where: { id: stageId, organizationId } });
  },

  async nextStageSortOrder(organizationId: string): Promise<number> {
    const last = await prisma.pipelineStage.findFirst({
      where: { organizationId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return (last?.sortOrder ?? -1) + 1;
  },

  async createStage(input: CreateStageInput, sortOrder: number): Promise<PipelineStageRecord> {
    return prisma.pipelineStage.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        sortOrder,
        isWon: input.isWon,
        isLost: input.isLost,
      },
    });
  },

  async updateStage(
    organizationId: string,
    stageId: string,
    data: UpdateStageInput,
  ): Promise<PipelineStageRecord> {
    return prisma.pipelineStage.update({ where: { id: stageId, organizationId }, data });
  },

  async deleteStage(organizationId: string, stageId: string): Promise<void> {
    await prisma.pipelineStage.delete({ where: { id: stageId, organizationId } });
  },

  async countDealsInStage(stageId: string): Promise<number> {
    return prisma.deal.count({ where: { stageId } });
  },

  async reorderStages(organizationId: string, orderedStageIds: string[]): Promise<void> {
    await prisma.$transaction(
      orderedStageIds.map((stageId, index) =>
        prisma.pipelineStage.update({
          where: { id: stageId, organizationId },
          data: { sortOrder: index },
        }),
      ),
    );
  },

  async listDeals(organizationId: string): Promise<DealWithRelations[]> {
    const rows = await prisma.deal.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: dealWithRelationsSelect,
    });
    return rows.map(toDealWithRelations);
  },

  async findDeal(organizationId: string, dealId: string): Promise<DealWithRelations | null> {
    const row = await prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      select: dealWithRelationsSelect,
    });
    return row ? toDealWithRelations(row) : null;
  },

  async createDeal(input: CreateDealInput): Promise<DealWithRelations> {
    const row = await prisma.deal.create({
      data: input,
      select: dealWithRelationsSelect,
    });
    return toDealWithRelations(row);
  },

  async updateDeal(
    organizationId: string,
    dealId: string,
    data: UpdateDealInput,
    resolvedStatus: { status: DealStatus; closedAt: Date | null } | null,
  ): Promise<DealWithRelations> {
    const row = await prisma.deal.update({
      where: { id: dealId, organizationId },
      data: { ...data, ...(resolvedStatus ?? {}) },
      select: dealWithRelationsSelect,
    });
    return toDealWithRelations(row);
  },

  async deleteDeal(organizationId: string, dealId: string): Promise<void> {
    await prisma.deal.delete({ where: { id: dealId, organizationId } });
  },

  async findMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<{ id: string } | null> {
    return prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
      select: { id: true },
    });
  },
};
