export const EXPLORE_SOCKET_EVENTS = {
  LOOK_CREATED: "look:created",
  FEED_SYNC_REQUEST: "feed:sync:request",
  FEED_SYNC_RESULT: "feed:sync:result",
} as const;

export type LookCreatedPayload = {
  lookId: string;
  creatorId: string;
  createdAt: string;
};

export type FeedSyncRequestPayload = {
  tab: string;
  since: string;
};

export type FeedSyncResultPayload = {
  count: number;
};
