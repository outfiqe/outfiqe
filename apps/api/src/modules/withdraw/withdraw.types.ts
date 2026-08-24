import type {
  WithdrawOwnerType,
  WithdrawRequestStatus,
  WithdrawWindowType,
} from "#generated/prisma/enums.js";

export type WithdrawPolicyRecord = {
  id: string;
  ownerType: WithdrawOwnerType;
  minAmount: number;
  maxAmount: number;
  windowType: WithdrawWindowType;
  windowValue: number;
  maxAttemptsPerWindow: number;
  cooldownAfterRejectionDays: number;
  processingNoteText: string;
  isActive: boolean;
  createdAt: Date;
};

export type WithdrawPolicyView = {
  ownerType: WithdrawOwnerType;
  minAmount: number;
  maxAmount: number;
  windowType: WithdrawWindowType;
  windowValue: number;
  maxAttemptsPerWindow: number;
  cooldownAfterRejectionDays: number;
  processingNoteText: string;
  nextWindowOpensAt: string;
};

export type WithdrawEligibilityView = {
  windowOpen: boolean;
  nextWindowOpensAt: string;
  attemptsUsed: number;
  attemptsRemaining: number;
  minAmount: number;
  maxAmount: number;
  availableBalance: number;
  hasVerifiedBankAccount: boolean;
  cooldownActive: boolean;
  cooldownEndsAt: string | null;
};

export type OwnerContext =
  { ownerType: "CREATOR"; creatorId: string } | { ownerType: "BUSINESS"; brandId: string };

export type CreateWithdrawRequestInput = {
  owner: OwnerContext;
  requestedById: string;
  bankAccountId: string;
  amount: number;
};

export type WithdrawRequestRecord = {
  id: string;
  ownerType: WithdrawOwnerType;
  creatorId: string | null;
  brandId: string | null;
  requestedById: string;
  bankAccountId: string | null;
  brandBankAccountId: string | null;
  policyId: string;
  amount: number;
  status: WithdrawRequestStatus;
  rejectionReason: string | null;
  referenceNote: string | null;
  requiresSecondSignOff: boolean;
  firstApprovedById: string | null;
  firstApprovedAt: Date | null;
  reviewedById: string | null;
  reviewedAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
};

export type WithdrawRequestView = {
  id: string;
  ownerType: WithdrawOwnerType;
  amount: number;
  status: WithdrawRequestStatus;
  rejectionReason: string | null;
  referenceNote: string | null;
  requiresSecondSignOff: boolean;
  createdAt: string;
  reviewedAt: string | null;
  paidAt: string | null;
};

export type AdminWithdrawRequestView = WithdrawRequestView & {
  ownerName: string;
  bankAccountLast4: string;
  firstApprovedById: string | null;
};
