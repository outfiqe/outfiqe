import { z } from "zod";

import { registerOfflineActionHandler } from "@/features/pwa";

import { exploreFeedApi } from "./api/exploreFeedApi";
import {
  FOLLOW_CREATOR_ACTION_TYPE,
  LIKE_LOOK_ACTION_TYPE,
  SAVE_LOOK_ACTION_TYPE,
} from "./utils/offlineActionTypes";

const likeLookPayloadSchema = z.object({ lookId: z.string(), liked: z.boolean() });

const saveLookPayloadSchema = z.object({ lookId: z.string(), saved: z.boolean() });

const followCreatorPayloadSchema = z.object({ creatorId: z.string(), following: z.boolean() });

registerOfflineActionHandler(LIKE_LOOK_ACTION_TYPE, async (payload) => {
  const { lookId, liked } = likeLookPayloadSchema.parse(payload);
  await (liked ? exploreFeedApi.unlike(lookId) : exploreFeedApi.like(lookId));
});

registerOfflineActionHandler(SAVE_LOOK_ACTION_TYPE, async (payload) => {
  const { lookId, saved } = saveLookPayloadSchema.parse(payload);
  await (saved ? exploreFeedApi.unsave(lookId) : exploreFeedApi.save(lookId));
});

registerOfflineActionHandler(FOLLOW_CREATOR_ACTION_TYPE, async (payload) => {
  const { creatorId, following } = followCreatorPayloadSchema.parse(payload);
  await (following ? exploreFeedApi.unfollow(creatorId) : exploreFeedApi.follow(creatorId));
});
