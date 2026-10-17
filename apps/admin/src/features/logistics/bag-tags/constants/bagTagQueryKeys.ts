export const BAG_TAG_BATCHES_QUERY_KEY = ["logistics-bag-tag-batches"] as const;

export const bagTagBatchesForHubQueryKey = (hubId: string) =>
  ["logistics-bag-tag-batches", hubId] as const;

export const bagTagSheetQueryKey = (batchId: string) =>
  ["logistics-bag-tag-sheet", batchId] as const;
