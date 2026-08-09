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

export type CreateCreatorLookInput = {
  creatorId: string;
  imageUrl: string;
  caption?: string;
  productIds: string[];
};

export type TaggedProductPage<T> = {
  products: T[];
  nextCursor: string | null;
};
