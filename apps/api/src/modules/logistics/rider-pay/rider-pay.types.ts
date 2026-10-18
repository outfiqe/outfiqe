import type {
  RiderEarningKind,
  RiderEarningStatus,
  RiderEmploymentType,
} from "#generated/prisma/enums.js";

export type RiderPayRateView = {
  id: string;
  countryCode: string;
  currency: string;
  employmentType: RiderEmploymentType;
  visitAmount: number;
  extraStopAmount: number;
  wastedVisitAmount: number;
  effectiveFrom: string;
  isActive: boolean;
  createdAt: string;
  createdByName: string | null;
};

export type RiderPayRatesView = {
  countryCode: string;
  currency: string;
  rateInEffect: {
    visitAmount: number;
    extraStopAmount: number;
    wastedVisitAmount: number;
    isDefault: boolean;
  };
  rates: RiderPayRateView[];
};

export type RiderEarningView = {
  id: string;
  riderId: string;
  riderName: string;
  riderTaskId: string;
  brandName: string;
  pickupLocationLabel: string;
  kind: RiderEarningKind;
  currency: string;
  stopCount: number;
  amount: number;
  status: RiderEarningStatus;
  earnedAt: string;
  releasesAt: string;
  availableAt: string | null;
  withdrawnAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
};

export type RiderEarningsSummaryView = {
  currency: string;
  pendingAmount: number;
  availableAmount: number;
  withdrawnAmount: number;
};
