import { z } from "zod";

import { apiClient } from "./apiClient";

export type FollowTargetType = "user" | "brand";

const followResultSchema = z.object({ following: z.boolean(), followerCount: z.number() });
export type FollowResult = z.infer<typeof followResultSchema>;

export const followerSchema = z.object({
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  isCreator: z.boolean(),
  isFollowedByViewer: z.boolean(),
});
export type Follower = z.infer<typeof followerSchema>;

const followersPageSchema = z.object({
  items: z.array(followerSchema),
  nextCursor: z.string().nullable(),
});
export type FollowersPage = z.infer<typeof followersPageSchema>;

const followedUserSchema = z.object({
  kind: z.literal("user"),
  id: z.string(),
  name: z.string(),
  handle: z.string(),
  isCreator: z.boolean(),
});
const followedBrandSchema = z.object({
  kind: z.literal("brand"),
  id: z.string(),
  name: z.string(),
});
export const followingItemSchema = z.discriminatedUnion("kind", [
  followedUserSchema,
  followedBrandSchema,
]);
export type FollowingItem = z.infer<typeof followingItemSchema>;

const followingPageSchema = z.object({
  items: z.array(followingItemSchema),
  nextCursor: z.string().nullable(),
});
export type FollowingPage = z.infer<typeof followingPageSchema>;

export const followApi = {
  async follow(targetType: FollowTargetType, targetId: string): Promise<FollowResult> {
    const followResponse = await apiClient.post<FollowResult>(`/follows/${targetType}/${targetId}`);
    return followResultSchema.parse(followResponse.data);
  },

  async unfollow(targetType: FollowTargetType, targetId: string): Promise<FollowResult> {
    const unfollowResponse = await apiClient.del<FollowResult>(
      `/follows/${targetType}/${targetId}`,
    );
    return followResultSchema.parse(unfollowResponse.data);
  },

  async listFollowers(
    targetType: FollowTargetType,
    targetId: string,
    params: { cursor?: string; q?: string },
  ): Promise<FollowersPage> {
    const query = new URLSearchParams();
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.q) query.set("q", params.q);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const res = await apiClient.get<FollowersPage>(
      `/follows/${targetType}/${targetId}/followers${suffix}`,
    );
    return followersPageSchema.parse(res.data);
  },

  async listFollowing(
    userId: string,
    params: { cursor?: string; q?: string },
  ): Promise<FollowingPage> {
    const query = new URLSearchParams();
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.q) query.set("q", params.q);
    const suffix = query.toString() ? `?${query.toString()}` : "";
    const res = await apiClient.get<FollowingPage>(`/follows/user/${userId}/following${suffix}`);
    return followingPageSchema.parse(res.data);
  },
};
