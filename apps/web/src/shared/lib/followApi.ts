import { z } from "zod";

import { apiClient } from "./apiClient";

export type FollowTargetType = "user" | "brand";

const followResultSchema = z.object({ following: z.boolean(), followerCount: z.number() });
export type FollowResult = z.infer<typeof followResultSchema>;

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
};
