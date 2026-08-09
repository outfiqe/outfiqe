import { apiClient } from "@/shared/lib/apiClient";
import { getSessionId } from "@/shared/lib/sessionId";
import {
  commentPageSchema,
  feedPageSchema,
  followResultSchema,
  likeResultSchema,
  saveResultSchema,
  suggestedCreatorsResponseSchema,
  trendingTagsResponseSchema,
  type CommentPage,
  type FeedPage,
} from "./exploreFeedSchemas";

type ListFeedInput = {
  tab: string;
  cursor?: string;
};

export const exploreFeedApi = {
  async list({ tab, cursor }: ListFeedInput): Promise<FeedPage> {
    const params = new URLSearchParams({ tab });
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<unknown>(`/creator-looks/feed?${params.toString()}`);
    return feedPageSchema.parse(res.data);
  },

  async like(lookId: string) {
    const res = await apiClient.post<unknown>(`/creator-looks/${lookId}/like`);
    return likeResultSchema.parse(res.data);
  },

  async unlike(lookId: string) {
    const res = await apiClient.del<unknown>(`/creator-looks/${lookId}/like`);
    return likeResultSchema.parse(res.data);
  },

  async save(lookId: string) {
    const res = await apiClient.post<unknown>(`/creator-looks/${lookId}/save`);
    return saveResultSchema.parse(res.data);
  },

  async unsave(lookId: string) {
    const res = await apiClient.del<unknown>(`/creator-looks/${lookId}/save`);
    return saveResultSchema.parse(res.data);
  },

  async follow(userId: string) {
    const res = await apiClient.post<unknown>(`/follows/user/${userId}`);
    return followResultSchema.parse(res.data);
  },

  async unfollow(userId: string) {
    const res = await apiClient.del<unknown>(`/follows/user/${userId}`);
    return followResultSchema.parse(res.data);
  },

  async listComments(lookId: string, cursor?: string): Promise<CommentPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<unknown>(
      `/creator-looks/${lookId}/comments?${params.toString()}`,
    );
    return commentPageSchema.parse(res.data);
  },

  async addComment(lookId: string, body: string) {
    const res = await apiClient.post<unknown>(`/creator-looks/${lookId}/comments`, { body });
    return res.data;
  },

  async recordTagClick(
    lookId: string,
    productId: string,
    source: "FEED" | "PRODUCT_PAGE" = "FEED",
  ) {
    await apiClient.post(`/creator-looks/${lookId}/tags/${productId}/click`, {
      sessionId: getSessionId(),
      source,
    });
  },

  async trendingTags() {
    const res = await apiClient.get<unknown>("/creator-looks/tags/trending");
    return trendingTagsResponseSchema.parse(res.data).tags;
  },

  async suggestedCreators() {
    const res = await apiClient.get<unknown>("/follows/suggested-creators");
    return suggestedCreatorsResponseSchema.parse(res.data).creators;
  },
};
