import { DealStatus } from "#generated/prisma/enums.js";
import { applyCrmCounterDelta, touchCrmActivity } from "#lib/crm-counters.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { crmRelationshipsService } from "#modules/crm-relationships/crm-relationships.service.js";

import { MAX_PIPELINE_STAGES, MIN_PIPELINE_STAGES } from "./crm-pipeline.constants.js";
import { crmPipelineRepository } from "./crm-pipeline.repository.js";
import type {
  DealWithRelations,
  PipelineStageRecord,
  UpdateDealInput,
  UpdateStageInput,
} from "./crm-pipeline.types.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const BAD_REQUEST_STATUS = 400;

type TenantOrganization = { id: string; linkedBrandId: string | null };

type DealPayload = {
  stageId: string;
  title: string;
  value: number;
  currency: string;
  expectedCloseDate: Date | null;
  ownerMembershipId: string | null;
  partnerCreatorId: string;
};

const resolveStatusForStage = (
  stage: Pick<PipelineStageRecord, "isWon" | "isLost">,
): { status: DealStatus; closedAt: Date | null } => {
  if (stage.isWon) return { status: DealStatus.WON, closedAt: new Date() };
  if (stage.isLost) return { status: DealStatus.LOST, closedAt: new Date() };
  return { status: DealStatus.OPEN, closedAt: null };
};

const assertNotBothOutcomes = (isWon: boolean, isLost: boolean): void => {
  if (isWon && isLost) {
    throw new AppError(
      "STAGE_OUTCOME_CONFLICT",
      "A stage can't be both a won stage and a lost stage.",
      BAD_REQUEST_STATUS,
    );
  }
};

const requireStage = async (
  organizationId: string,
  stageId: string,
): Promise<PipelineStageRecord> => {
  const stage = await crmPipelineRepository.findStage(organizationId, stageId);
  if (!stage) throw new AppError("STAGE_NOT_FOUND", "Pipeline stage not found.", NOT_FOUND_STATUS);
  return stage;
};

export const crmPipelineService = {
  listStages(organizationId: string): Promise<PipelineStageRecord[]> {
    return crmPipelineRepository.listStages(organizationId);
  },

  async createStage(
    organizationId: string,
    input: { name: string; isWon: boolean; isLost: boolean },
  ): Promise<PipelineStageRecord> {
    assertNotBothOutcomes(input.isWon, input.isLost);

    const existing = await crmPipelineRepository.listStages(organizationId);
    if (existing.length >= MAX_PIPELINE_STAGES) {
      throw new AppError(
        "TOO_MANY_STAGES",
        `A pipeline can have at most ${MAX_PIPELINE_STAGES} stages.`,
        CONFLICT_STATUS,
      );
    }

    const sortOrder = await crmPipelineRepository.nextStageSortOrder(organizationId);
    try {
      return await crmPipelineRepository.createStage({ organizationId, ...input }, sortOrder);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          "STAGE_NAME_TAKEN",
          "A stage with that name already exists.",
          CONFLICT_STATUS,
        );
      }
      throw error;
    }
  },

  async updateStage(
    organizationId: string,
    stageId: string,
    data: UpdateStageInput,
  ): Promise<PipelineStageRecord> {
    const current = await requireStage(organizationId, stageId);
    const nextIsWon = data.isWon ?? current.isWon;
    const nextIsLost = data.isLost ?? current.isLost;
    assertNotBothOutcomes(nextIsWon, nextIsLost);

    try {
      return await crmPipelineRepository.updateStage(organizationId, stageId, data);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          "STAGE_NAME_TAKEN",
          "A stage with that name already exists.",
          CONFLICT_STATUS,
        );
      }
      throw error;
    }
  },

  async deleteStage(organizationId: string, stageId: string): Promise<void> {
    await requireStage(organizationId, stageId);

    const stages = await crmPipelineRepository.listStages(organizationId);
    if (stages.length <= MIN_PIPELINE_STAGES) {
      throw new AppError(
        "PIPELINE_TOO_SMALL",
        `A pipeline must keep at least ${MIN_PIPELINE_STAGES} stages.`,
        CONFLICT_STATUS,
      );
    }

    const dealCount = await crmPipelineRepository.countDealsInStage(stageId);
    if (dealCount > 0) {
      throw new AppError(
        "STAGE_NOT_EMPTY",
        "Move or delete this stage's deals before removing it.",
        CONFLICT_STATUS,
      );
    }

    await crmPipelineRepository.deleteStage(organizationId, stageId);
  },

  async reorderStages(organizationId: string, orderedStageIds: string[]): Promise<void> {
    const stages = await crmPipelineRepository.listStages(organizationId);
    const currentIds = new Set(stages.map((stage) => stage.id));

    const isFullPermutation =
      orderedStageIds.length === currentIds.size &&
      orderedStageIds.every((id) => currentIds.has(id)) &&
      new Set(orderedStageIds).size === orderedStageIds.length;

    if (!isFullPermutation) {
      throw new AppError(
        "INVALID_STAGE_ORDER",
        "The stage order must list every stage exactly once.",
        BAD_REQUEST_STATUS,
      );
    }

    await crmPipelineRepository.reorderStages(organizationId, orderedStageIds);
  },

  listDeals(organizationId: string): Promise<DealWithRelations[]> {
    return crmPipelineRepository.listDeals(organizationId);
  },

  async getDeal(organizationId: string, dealId: string): Promise<DealWithRelations> {
    const deal = await crmPipelineRepository.findDeal(organizationId, dealId);
    if (!deal) throw new AppError("DEAL_NOT_FOUND", "Deal not found.", NOT_FOUND_STATUS);
    return deal;
  },

  async createDeal(
    organization: TenantOrganization,
    payload: DealPayload,
  ): Promise<DealWithRelations> {
    const stage = await requireStage(organization.id, payload.stageId);
    await this.assertPartner(organization, payload.partnerCreatorId);
    await this.assertOwnerMembership(organization.id, payload.ownerMembershipId);

    const deal = await crmPipelineRepository.createDeal({
      organizationId: organization.id,
      stageId: payload.stageId,
      title: payload.title,
      value: payload.value,
      currency: payload.currency,
      expectedCloseDate: payload.expectedCloseDate,
      ownerMembershipId: payload.ownerMembershipId,
      partnerCreatorId: payload.partnerCreatorId,
    });

    await applyCrmCounterDelta(organization.id, "dealCount", 1);

    if (stage.isWon || stage.isLost) {
      return crmPipelineRepository.updateDeal(
        organization.id,
        deal.id,
        {},
        resolveStatusForStage(stage),
      );
    }
    return deal;
  },

  async updateDeal(
    organizationId: string,
    dealId: string,
    data: UpdateDealInput,
  ): Promise<DealWithRelations> {
    await this.getDeal(organizationId, dealId);
    await this.assertOwnerMembership(organizationId, data.ownerMembershipId ?? null);

    let resolvedStatus: { status: DealStatus; closedAt: Date | null } | null = null;
    if (data.stageId) {
      const stage = await requireStage(organizationId, data.stageId);
      resolvedStatus = resolveStatusForStage(stage);
    }

    const deal = await crmPipelineRepository.updateDeal(
      organizationId,
      dealId,
      data,
      resolvedStatus,
    );
    await touchCrmActivity(organizationId);
    return deal;
  },

  async deleteDeal(organizationId: string, dealId: string): Promise<void> {
    await this.getDeal(organizationId, dealId);
    await crmPipelineRepository.deleteDeal(organizationId, dealId);
    await applyCrmCounterDelta(organizationId, "dealCount", -1, { touchLastActivity: false });
  },

  async assertPartner(organization: TenantOrganization, partnerCreatorId: string): Promise<void> {
    const isPartner = await crmRelationshipsService.isPartner(organization, partnerCreatorId);
    if (!isPartner) {
      throw new AppError(
        "NOT_A_PARTNER",
        "A deal can only be opened against a partner of this brand.",
        BAD_REQUEST_STATUS,
      );
    }
  },

  async assertOwnerMembership(
    organizationId: string,
    ownerMembershipId: string | null,
  ): Promise<void> {
    if (!ownerMembershipId) return;
    const membership = await crmPipelineRepository.findMembership(
      organizationId,
      ownerMembershipId,
    );
    if (!membership) {
      throw new AppError(
        "OWNER_NOT_FOUND",
        "The deal owner isn't a member of this organization.",
        NOT_FOUND_STATUS,
      );
    }
  },
};
