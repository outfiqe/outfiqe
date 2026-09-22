export type TourKey = "brand-dashboard" | "creator-dashboard" | "crm-dashboard";

export type TourOutcome = "COMPLETED" | "DISMISSED";

export type TourProgress = {
  tourKey: TourKey;
  version: number;
  outcome: TourOutcome;
  updatedAt: string;
};
