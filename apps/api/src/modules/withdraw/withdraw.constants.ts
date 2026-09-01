import { WithdrawOwnerType, WithdrawWindowType } from "#generated/prisma/enums.js";

type WithdrawPolicyDefaults = {
  minAmount: number;
  maxAmount: number;
  windowType: WithdrawWindowType;
  windowValue: number;
  maxAttemptsPerWindow: number;
  cooldownAfterRejectionDays: number;
  processingNoteText: string;
};

export const DEFAULT_WITHDRAW_POLICY: Record<WithdrawOwnerType, WithdrawPolicyDefaults> = {
  [WithdrawOwnerType.CREATOR]: {
    minAmount: 500,
    maxAmount: 100_000,
    windowType: WithdrawWindowType.MONTHLY,
    windowValue: 5,
    maxAttemptsPerWindow: 1,
    cooldownAfterRejectionDays: 7,
    processingNoteText: "Processed manually, 5-7 business days after approval.",
  },
  [WithdrawOwnerType.BUSINESS]: {
    minAmount: 3_000,
    maxAmount: 500_000,
    windowType: WithdrawWindowType.CUSTOM_DAYS,
    windowValue: 14,
    maxAttemptsPerWindow: 1,
    cooldownAfterRejectionDays: 5,
    processingNoteText: "Processed manually, 3-5 business days after approval.",
  },
};
