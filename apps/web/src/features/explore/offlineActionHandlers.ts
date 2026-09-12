import { z } from "zod";

import { registerOfflineActionHandler } from "@/features/pwa";

import { exploreFeedApi } from "./api/exploreFeedApi";
import { patchCreatorInFeedCaches, patchPostInFeedCaches } from "./utils/feedCacheUpdate";
import {
  FOLLOW_CREATOR_ACTION_TYPE,
  LIKE_LOOK_ACTION_TYPE,
  SAVE_LOOK_ACTION_TYPE,
} from "./utils/offlineActionTypes";

const likeLookPayloadSchema = z.object({ lookId: z.string(), liked: z.boolean() });

const saveLookPayloadSchema = z.object({ lookId: z.string(), saved: z.boolean() });

const followCreatorPayloadSchema = z.object({ creatorId: z.string(), following: z.boolean() });

registerOfflineActionHandler(LIKE_LOOK_ACTION_TYPE, async (payload, queryClient) => {
  const { lookId, liked } = likeLookPayloadSchema.parse(payload);
  const result = await (liked ? exploreFeedApi.unlike(lookId) : exploreFeedApi.like(lookId));
  patchPostInFeedCaches(queryClient, lookId, (post) => ({
    ...post,
    isLiked: result.liked,
    likeCount: result.likeCount,
  }));
});

registerOfflineActionHandler(SAVE_LOOK_ACTION_TYPE, async (payload, queryClient) => {
  const { lookId, saved } = saveLookPayloadSchema.parse(payload);
  const result = await (saved ? exploreFeedApi.unsave(lookId) : exploreFeedApi.save(lookId));
  patchPostInFeedCaches(queryClient, lookId, (post) => ({
    ...post,
    isSaved: result.saved,
    saveCount: result.saveCount,
  }));
});

registerOfflineActionHandler(FOLLOW_CREATOR_ACTION_TYPE, async (payload, queryClient) => {
  const { creatorId, following } = followCreatorPayloadSchema.parse(payload);
  const result = await (following
    ? exploreFeedApi.unfollow(creatorId)
    : exploreFeedApi.follow(creatorId));
  patchCreatorInFeedCaches(queryClient, creatorId, result.following);
});
