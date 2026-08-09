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
  imageUrl: string;
  caption?: string;
  taggedProducts: TaggedProductInput[];
  hashtags: string[];
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

export type ListFeedInput = {
  tab: string;
  cursor?: string;
  limit: number;
  viewerId?: string;
};

export type CommentRecord = {
  id: string;
  userId: string;
  userName: string;
  userHandle: string;
  body: string;
  createdAt: Date;
};

export type CommentPage = {
  comments: CommentRecord[];
  nextCursor: string | null;
};

export type TrendingTag = {
  tag: string;
  postCount: number;
};
