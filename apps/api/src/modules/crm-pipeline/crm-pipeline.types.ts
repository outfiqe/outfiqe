import type { DealStatus } from "#generated/prisma/enums.js";

export type PipelineStageRecord = {
  id: string;
  organizationId: string;
  name: string;
  sortOrder: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type DealRecord = {
  id: string;
  organizationId: string;
  stageId: string;
  title: string;
  value: number;
  currency: string;
  expectedCloseDate: Date | null;
  ownerMembershipId: string | null;
  partnerCreatorId: string;
  status: DealStatus;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DealWithRelations = DealRecord & {
  partnerName: string;
  partnerHandle: string;
  ownerName: string | null;
  stageName: string;
};

export type CreateStageInput = {
  organizationId: string;
  name: string;
  isWon: boolean;
  isLost: boolean;
};

export type UpdateStageInput = {
  name?: string;
  isWon?: boolean;
  isLost?: boolean;
};

export type CreateDealInput = {
  organizationId: string;
  stageId: string;
  title: string;
  value: number;
  currency: string;
  expectedCloseDate: Date | null;
  ownerMembershipId: string | null;
  partnerCreatorId: string;
};

export type UpdateDealInput = {
  stageId?: string;
  title?: string;
  value?: number;
  currency?: string;
  expectedCloseDate?: Date | null;
  ownerMembershipId?: string | null;
};
