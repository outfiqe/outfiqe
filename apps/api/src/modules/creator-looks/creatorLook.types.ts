export type TaggedProduct = {
  id: string;
  name: string;
  imageUrl: string | null;
};

export type CreatorLookRecord = {
  id: string;
  creatorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: Date;
};

export type CreatorLookSummary = CreatorLookRecord & {
  taggedProducts: TaggedProduct[];
};

export type TaggedProductInput = {
  productId: string;
  sizeWorn: string;
};

export type CreateCreatorLookInput = {
  creatorId: string;
  imageUrls: [string, ...string[]];
  caption?: string;
  taggedProducts: TaggedProductInput[];
  hashtags: string[];
};

export type UpdateCreatorLookInput = {
  imageUrls: [string, ...string[]];
  caption?: string;
  taggedProducts: TaggedProductInput[];
  hashtags: string[];
};

export type CreatorLookEditTaggedProduct = TaggedProductInput & {
  product: {
    id: string;
    name: string;
    brand: string;
    price: number;
    imageUrl: string | null;
  };
};

export type CreatorLookEditDetail = {
  id: string;
  imageUrls: string[];
  caption: string | null;
  taggedProducts: CreatorLookEditTaggedProduct[];
};

export type TaggedProductPage<T> = {
  products: T[];
  nextCursor: string | null;
};

export type FeedTaggedProduct = {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string | null;
};

export type FeedCreator = {
  id: string;
  name: string;
  handle: string;
  isApproved: boolean;
};

export type CreatorLookFeedPost = {
  id: string;
  creator: FeedCreator;
  imageUrl: string;
  images: string[];
  caption: string | null;
  likeCount: number;
  commentCount: number;
  saveCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowingCreator: boolean;
  taggedProducts: FeedTaggedProduct[];
  hashtags: string[];
  createdAt: Date;
};

export type FeedPage = {
  posts: CreatorLookFeedPost[];
  nextCursor: string | null;
};

export type LookSearchPage = FeedPage & { total: number };

export type PostSuggestion = {
  id: string;
  imageUrl: string;
  caption: string | null;
  creator: { name: string; handle: string };
};

export type ListFeedInput = {
  tab: string;
  cursor?: string;
  limit: number;
  viewerId?: string;
};

export type CommentReplyRecord = {
  id: string;
  parentCommentId: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatarUrl: string | null;
  body: string;
  createdAt: Date;
};

export type CommentRecord = {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  userAvatarUrl: string | null;
  body: string;
  createdAt: Date;
  replyCount: number;
  previewReplies: CommentReplyRecord[];
};

export type CommentPage = {
  comments: CommentRecord[];
  nextCursor: string | null;
};

export type CommentReplyPage = {
  replies: CommentReplyRecord[];
  nextCursor: string | null;
};

export type TrendingTag = {
  tag: string;
  postCount: number;
};

export type PostMetricBucket = {
  lookId: string;
  bucketStart: Date;
  likes: number;
  comments: number;
  saves: number;
  tagClicks: number;
};

export type PostTrendMeta = {
  id: string;
  creatorId: string;
  createdAt: Date;
};

export type PostBaselineSource = "post" | "global";

export type PostScoreBreakdown = {
  lookId: string;
  creatorId: string;
  recentActivity: {
    likes: number;
    comments: number;
    saves: number;
    tagClicks: number;
  };
  decayedActivity: number;
  previousWindowActivity: number;
  velocity: number;
  baseline: { source: PostBaselineSource; value: number };
  baselineLift: number;
  momentum: number;
  freshnessMultiplier: number;
  score: number;
};

export type PostTrendingEntry = { lookId: string; score: number };

export type CreatorMomentumEntry = { creatorId: string; momentum: number };

export type CandidateAffinityMeta = {
  id: string;
  creatorId: string;
  hashtags: string[];
};

export type ViewerAffinity = {
  followedCreatorIds: Set<string>;
  engagedCreatorIds: Set<string>;
  hashtagWeights: Map<string, number>;
};

export type TagMetricBucket = {
  tag: string;
  bucketStart: Date;
  postCount: number;
};

export type TagBaselineSource = "tag" | "global";

export type TagScoreBreakdown = {
  tag: string;
  recentActivity: { postCount: number };
  decayedActivity: number;
  previousWindowActivity: number;
  velocity: number;
  baseline: { source: TagBaselineSource; value: number };
  baselineLift: number;
  momentum: number;
  score: number;
};
