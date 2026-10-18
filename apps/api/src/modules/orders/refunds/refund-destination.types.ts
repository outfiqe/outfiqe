import type { RefundDestinationKind } from "#generated/prisma/enums.js";

export type RefundDestinationView = {
  kind: RefundDestinationKind;
  walletId: string | null;
  bankId: string | null;
  bankName: string | null;
  accountName: string;
  accountNumberLast4: string | null;
  updatedAt: string;
};

export type MyRefundDestinationView = {
  amountAwaitingDetails: number;
  canEdit: boolean;
  suggestedKind: RefundDestinationKind | null;
  suggestedWalletId: string;
  suggestedAccountName: string;
  destination: RefundDestinationView | null;
};
