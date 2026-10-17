import type { BagTagBatchSummaryRecord } from "./bag-tag.repository.js";
import type { BagTagBatchSummary } from "./bag-tag.types.js";

export const toBagTagBatchSummary = (batch: BagTagBatchSummaryRecord): BagTagBatchSummary => ({
  id: batch.id,
  hubId: batch.hubId,
  hubName: batch.hub.name,
  tagCount: batch.tagCount,
  usedTagCount: batch._count.tags,
  createdAt: batch.createdAt.toISOString(),
});
