import type { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";
import { getSessionId } from "@/shared/lib/sessionId";

import {
  type CommentPage,
  commentPageSchema,
  commentSchema,
  type FeedComment,
  type FeedPage,
  feedPageSchema,
  followResultSchema,
  likeResultSchema,
  saveResultSchema,
  suggestedCreatorsResponseSchema,
  trendingTagsResponseSchema,
} from "./exploreFeedSchemas";

type ListFeedInput = {
  tab: string;
  cursor?: string;
};

type LikeResult = z.infer<typeof likeResultSchema>;
type SaveResult = z.infer<typeof saveResultSchema>;
type FollowResult = z.infer<typeof followResultSchema>;
type TrendingTagsResponse = z.infer<typeof trendingTagsResponseSchema>;
type SuggestedCreatorsResponse = z.infer<typeof suggestedCreatorsResponseSchema>;

export const exploreFeedApi = {
  async list({ tab, cursor }: ListFeedInput): Promise<FeedPage> {
    const params = new URLSearchParams({ tab });
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<FeedPage>(`/creator-looks/feed?${params.toString()}`);
    return feedPageSchema.parse(res.data);
  },

  async like(lookId: string): Promise<LikeResult> {
    const res = await apiClient.post<LikeResult>(`/creator-looks/${lookId}/like`);
    return likeResultSchema.parse(res.data);
  },

  async unlike(lookId: string): Promise<LikeResult> {
    const res = await apiClient.del<LikeResult>(`/creator-looks/${lookId}/like`);
    return likeResultSchema.parse(res.data);
  },

  async save(lookId: string): Promise<SaveResult> {
    const res = await apiClient.post<SaveResult>(`/creator-looks/${lookId}/save`);
    return saveResultSchema.parse(res.data);
  },

  async unsave(lookId: string): Promise<SaveResult> {
    const res = await apiClient.del<SaveResult>(`/creator-looks/${lookId}/save`);
    return saveResultSchema.parse(res.data);
  },

  async follow(userId: string): Promise<FollowResult> {
    const res = await apiClient.post<FollowResult>(`/follows/user/${userId}`);
    return followResultSchema.parse(res.data);
  },

  async unfollow(userId: string): Promise<FollowResult> {
    const res = await apiClient.del<FollowResult>(`/follows/user/${userId}`);
    return followResultSchema.parse(res.data);
  },

  async listComments(lookId: string, cursor?: string): Promise<CommentPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<CommentPage>(
      `/creator-looks/${lookId}/comments?${params.toString()}`,
    );
    return commentPageSchema.parse(res.data);
  },

  async addComment(lookId: string, body: string): Promise<FeedComment> {
    const res = await apiClient.post<FeedComment>(`/creator-looks/${lookId}/comments`, { body });
    return commentSchema.parse(res.data);
  },

  async recordTagClick(
    lookId: string,
    productId: string,
    source: "FEED" | "PRODUCT_PAGE" = "FEED",
  ): Promise<void> {
    await apiClient.post(`/creator-looks/${lookId}/tags/${productId}/click`, {
      sessionId: getSessionId(),
      source,
    });
  },

  async trendingTags() {
    const res = await apiClient.get<TrendingTagsResponse>("/creator-looks/tags/trending");
    return trendingTagsResponseSchema.parse(res.data).tags;
  },

  async suggestedCreators() {
    const res = await apiClient.get<SuggestedCreatorsResponse>("/follows/suggested-creators");
    return suggestedCreatorsResponseSchema.parse(res.data).creators;
  },
};
