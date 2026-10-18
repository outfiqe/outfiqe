import type { ContractorRiderPay } from "#constants/country.constants.js";
import { RiderEarningKind } from "#generated/prisma/enums.js";

import type { RiderEarningRecord, RiderPayRateRecord } from "./rider-pay.repository.js";
import type { RiderEarningView, RiderPayRateView } from "./rider-pay.types.js";

const FIRST_STOP = 1;

export const calculateVisitEarning = (
  { kind, stopCount }: { kind: RiderEarningKind; stopCount: number },
  { visitAmount, extraStopAmount, wastedVisitAmount }: ContractorRiderPay,
): number => {
  if (kind === RiderEarningKind.WASTED_VISIT) return wastedVisitAmount;
  const extraStopCount = Math.max(stopCount - FIRST_STOP, 0);
  return visitAmount + extraStopAmount * extraStopCount;
};

export const toRiderPayRateView = ({
  effectiveFrom,
  createdAt,
  createdBy,
  ...rate
}: RiderPayRateRecord): RiderPayRateView => ({
  ...rate,
  effectiveFrom: effectiveFrom.toISOString(),
  createdAt: createdAt.toISOString(),
  createdByName: createdBy?.name ?? null,
});

export const toRiderEarningView = ({
  riderTask,
  rider,
  earnedAt,
  releasesAt,
  availableAt,
  withdrawnAt,
  voidedAt,
  ...earning
}: RiderEarningRecord): RiderEarningView => ({
  ...earning,
  riderId: rider.id,
  riderName: rider.user.name,
  brandName: riderTask.brand.name,
  pickupLocationLabel: riderTask.pickupLocation.label,
  earnedAt: earnedAt.toISOString(),
  releasesAt: releasesAt.toISOString(),
  availableAt: availableAt?.toISOString() ?? null,
  withdrawnAt: withdrawnAt?.toISOString() ?? null,
  voidedAt: voidedAt?.toISOString() ?? null,
});
