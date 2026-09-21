export const TourKey = {
  BRAND_DASHBOARD: "brand-dashboard",
} as const;

export type TourKey = (typeof TourKey)[keyof typeof TourKey];

export const TourOutcome = {
  COMPLETED: "COMPLETED",
  DISMISSED: "DISMISSED",
} as const;

export type TourOutcome = (typeof TourOutcome)[keyof typeof TourOutcome];

export type TourProgress = {
  tourKey: TourKey;
  version: number;
  outcome: TourOutcome;
  updatedAt: string;
};
