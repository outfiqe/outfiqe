export const IMAGE_JOB_PRIORITY_TIERS = {
  paidCreator: "paidCreator",
  standard: "standard",
  bulkAdmin: "bulkAdmin",
} as const;

export type ImageJobPriorityTier =
  (typeof IMAGE_JOB_PRIORITY_TIERS)[keyof typeof IMAGE_JOB_PRIORITY_TIERS];

const TOP_PRIORITY = 1;
const STANDARD_PRIORITY = 5;
const BULK_PRIORITY = 10;

export const IMAGE_JOB_PRIORITY_VALUES: Record<ImageJobPriorityTier, number> = {
  paidCreator: TOP_PRIORITY,
  standard: STANDARD_PRIORITY,
  bulkAdmin: BULK_PRIORITY,
};

export const priorityValueForTier = (tier: ImageJobPriorityTier): number =>
  IMAGE_JOB_PRIORITY_VALUES[tier];
