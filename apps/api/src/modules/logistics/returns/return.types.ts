import type { ParcelReturnOutcome } from "#generated/prisma/enums.js";

export type ReturnedParcelView = {
  shipmentId: string;
  outcome: ParcelReturnOutcome;
  refundId: string | null;
  brandReturnIds: string[];
  recordedRefusal: boolean;
  partnerClaimAmount: number | null;
};
