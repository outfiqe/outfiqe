import { apiClient } from "@/shared/lib/apiClient";

import {
  type RejectTagInput,
  tagReviewPendingCountSchema,
  type TagReviewQueuePage,
  tagReviewQueuePageSchema,
  type TagReviewStatusValue,
} from "./tagReviewSchemas";

const QUEUE_PAGE_SIZE = 20;

export const tagReviewApi = {
  async listQueue(status: TagReviewStatusValue, cursor?: string): Promise<TagReviewQueuePage> {
    const params = new URLSearchParams({ status, limit: String(QUEUE_PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);
    const res = await apiClient.get<TagReviewQueuePage>(`/tag-reviews?${params.toString()}`);
    return tagReviewQueuePageSchema.parse(res.data);
  },

  async pendingCount(): Promise<number> {
    const res = await apiClient.get<{ pendingCount: number }>("/tag-reviews/pending-count");
    return tagReviewPendingCountSchema.parse(res.data).pendingCount;
  },

  async approve(tagId: string, trustCreator: boolean): Promise<void> {
    await apiClient.post(`/tag-reviews/${tagId}/approve`, { trustCreator });
  },

  async reject(tagId: string, input: RejectTagInput): Promise<void> {
    await apiClient.post(`/tag-reviews/${tagId}/reject`, input);
  },
};
