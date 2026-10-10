export const EXPLORE_SOCKET_EVENTS = {
  LOOK_CREATED: "look:created",
  FEED_SYNC_REQUEST: "feed:sync:request",
  FEED_SYNC_RESULT: "feed:sync:result",
  COMMENTS_SUBSCRIBE: "comments:subscribe",
  COMMENTS_UNSUBSCRIBE: "comments:unsubscribe",
  COMMENT_CREATED: "comment:created",
  COMMENT_REPLY_CREATED: "comment:reply:created",
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

export type CommentSubscriptionPayload = {
  lookId: string;
};

export type CommentCreatedSocketPayload = {
  lookId: string;
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatarUrl: string | null;
  body: string;
  createdAt: string;
  replyCount: number;
};

export type CommentReplyCreatedSocketPayload = {
  lookId: string;
  id: string;
  parentCommentId: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatarUrl: string | null;
  body: string;
  createdAt: string;
};
