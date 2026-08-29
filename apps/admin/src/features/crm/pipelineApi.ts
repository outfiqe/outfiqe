import { apiClient } from "@/lib/apiClient";

import {
  type Deal,
  dealListSchema,
  dealSchema,
  type PipelineStage,
  pipelineStageListSchema,
  pipelineStageSchema,
} from "./pipelineSchemas";

export const crmPipelineApi = {
  async listStages(): Promise<PipelineStage[]> {
    const res = await apiClient.get<PipelineStage[]>("/crm/pipeline/stages");
    return pipelineStageListSchema.parse(res.data);
  },

  async createStage(input: {
    name: string;
    isWon?: boolean;
    isLost?: boolean;
  }): Promise<PipelineStage> {
    const res = await apiClient.post<PipelineStage>("/crm/pipeline/stages", input);
    return pipelineStageSchema.parse(res.data);
  },

  async updateStage(
    stageId: string,
    input: { name?: string; isWon?: boolean; isLost?: boolean },
  ): Promise<PipelineStage> {
    const res = await apiClient.patch<PipelineStage>(`/crm/pipeline/stages/${stageId}`, input);
    return pipelineStageSchema.parse(res.data);
  },

  async deleteStage(stageId: string): Promise<void> {
    await apiClient.del(`/crm/pipeline/stages/${stageId}`);
  },

  async reorderStages(orderedStageIds: string[]): Promise<void> {
    await apiClient.post("/crm/pipeline/stages/reorder", { orderedStageIds });
  },

  async listDeals(): Promise<Deal[]> {
    const res = await apiClient.get<Deal[]>("/crm/deals");
    return dealListSchema.parse(res.data);
  },

  async createDeal(input: {
    stageId: string;
    title: string;
    partnerCreatorId: string;
    value?: number;
    ownerMembershipId?: string | null;
    expectedCloseDate?: string | null;
  }): Promise<Deal> {
    const res = await apiClient.post<Deal>("/crm/deals", input);
    return dealSchema.parse(res.data);
  },

  async updateDeal(
    dealId: string,
    input: {
      stageId?: string;
      title?: string;
      value?: number;
      ownerMembershipId?: string | null;
      expectedCloseDate?: string | null;
    },
  ): Promise<Deal> {
    const res = await apiClient.patch<Deal>(`/crm/deals/${dealId}`, input);
    return dealSchema.parse(res.data);
  },

  async deleteDeal(dealId: string): Promise<void> {
    await apiClient.del(`/crm/deals/${dealId}`);
  },
};
