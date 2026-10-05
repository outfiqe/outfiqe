import { apiClient } from "@/shared/lib/apiClient";

import {
  type BuildComment,
  type BuildCommentPage,
  buildCommentPageSchema,
  buildCommentSchema,
  likeResultSchema,
  type PublicBuildDetail,
  publicBuildDetailSchema,
  type PublicBuildFilters,
  type PublicBuildPage,
  publicBuildPageSchema,
  saveResultSchema,
} from "./outfitSocialSchemas";

const TRUE_PARAM = "true";

const toFilterParams = (
  { category, minPrice, maxPrice, isInStockOnly, contributorId, brandId }: PublicBuildFilters,
  cursor: string | undefined,
) => ({
  category,
  minPrice,
  maxPrice,
  inStockOnly: isInStockOnly ? TRUE_PARAM : undefined,
  contributorId,
  brandId,
  cursor,
});

export const outfitSocialApi = {
  async listPublic(filters: PublicBuildFilters, cursor?: string): Promise<PublicBuildPage> {
    const res = await apiClient.get("/outfits/public", {
      params: toFilterParams(filters, cursor),
    });
    return publicBuildPageSchema.parse(res.data);
  },

  async listSaved(cursor?: string): Promise<PublicBuildPage> {
    const res = await apiClient.get("/outfits/saved", { params: { cursor } });
    return publicBuildPageSchema.parse(res.data);
  },

  async getPublic(outfitId: string): Promise<PublicBuildDetail> {
    const res = await apiClient.get(`/outfits/${outfitId}/public`);
    return publicBuildDetailSchema.parse(res.data);
  },

  async setLiked(outfitId: string, isLiked: boolean) {
    const path = `/outfits/${outfitId}/like`;
    const res = isLiked ? await apiClient.put(path) : await apiClient.del(path);
    return likeResultSchema.parse(res.data);
  },

  async setSaved(outfitId: string, isSaved: boolean) {
    const path = `/outfits/${outfitId}/save`;
    const res = isSaved ? await apiClient.put(path) : await apiClient.del(path);
    return saveResultSchema.parse(res.data);
  },

  async listComments(outfitId: string, cursor?: string): Promise<BuildCommentPage> {
    const res = await apiClient.get(`/outfits/${outfitId}/comments`, { params: { cursor } });
    return buildCommentPageSchema.parse(res.data);
  },

  async listReplies(outfitId: string, commentId: string, cursor?: string) {
    const res = await apiClient.get(`/outfits/${outfitId}/comments/${commentId}/replies`, {
      params: { cursor },
    });
    return buildCommentPageSchema.parse(res.data);
  },

  async addComment(
    outfitId: string,
    input: { body: string; parentCommentId?: string },
  ): Promise<BuildComment> {
    const res = await apiClient.post(`/outfits/${outfitId}/comments`, input);
    return buildCommentSchema.parse(res.data);
  },

  async removeComment(outfitId: string, commentId: string): Promise<void> {
    await apiClient.del(`/outfits/${outfitId}/comments/${commentId}`);
  },
};
