import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

import type {
  CreateDealBody,
  CreateStageBody,
  DealIdParams,
  ReorderStagesBody,
  StageIdParams,
  UpdateDealBody,
  UpdateStageBody,
} from "./crm-pipeline.schemas.js";
import { crmPipelineService } from "./crm-pipeline.service.js";

const CREATED_STATUS = 201;

export const crmPipelineController = {
  async listStages(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    sendSuccess(res, await crmPipelineService.listStages(organization.id), "Pipeline stages.");
  },

  async createStage(_req: Request, res: Response) {
    const body = validated.body<CreateStageBody>(res);
    const organization = getResolvedOrganization(res);
    const stage = await crmPipelineService.createStage(organization.id, body);
    sendSuccess(res, stage, "Stage created.", CREATED_STATUS);
  },

  async updateStage(_req: Request, res: Response) {
    const { stageId } = validated.params<StageIdParams>(res);
    const body = validated.body<UpdateStageBody>(res);
    const organization = getResolvedOrganization(res);
    sendSuccess(
      res,
      await crmPipelineService.updateStage(organization.id, stageId, body),
      "Stage updated.",
    );
  },

  async deleteStage(_req: Request, res: Response) {
    const { stageId } = validated.params<StageIdParams>(res);
    const organization = getResolvedOrganization(res);
    await crmPipelineService.deleteStage(organization.id, stageId);
    sendSuccess(res, null, "Stage deleted.");
  },

  async reorderStages(_req: Request, res: Response) {
    const { orderedStageIds } = validated.body<ReorderStagesBody>(res);
    const organization = getResolvedOrganization(res);
    await crmPipelineService.reorderStages(organization.id, orderedStageIds);
    sendSuccess(res, null, "Pipeline reordered.");
  },

  async listDeals(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    sendSuccess(res, await crmPipelineService.listDeals(organization.id), "Deals.");
  },

  async createDeal(_req: Request, res: Response) {
    const body = validated.body<CreateDealBody>(res);
    const organization = getResolvedOrganization(res);
    const deal = await crmPipelineService.createDeal(organization, body);
    sendSuccess(res, deal, "Deal created.", CREATED_STATUS);
  },

  async updateDeal(_req: Request, res: Response) {
    const { dealId } = validated.params<DealIdParams>(res);
    const body = validated.body<UpdateDealBody>(res);
    const organization = getResolvedOrganization(res);
    sendSuccess(
      res,
      await crmPipelineService.updateDeal(organization.id, dealId, body),
      "Deal updated.",
    );
  },

  async deleteDeal(_req: Request, res: Response) {
    const { dealId } = validated.params<DealIdParams>(res);
    const organization = getResolvedOrganization(res);
    await crmPipelineService.deleteDeal(organization.id, dealId);
    sendSuccess(res, null, "Deal deleted.");
  },
};
