import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { AccountStatus, CreatorStatus, TagReviewStatus } from "#generated/prisma/enums.js";
import { RESPONSIVE_IMAGE_ASSET_SELECT, toResponsiveImage } from "#lib/responsive-image.utils.js";

import type { CreatorLookFeedPost } from "../creator-look.types.js";

const feedRelationsInclude = {
  creator: {
    select: {
      id: true,
      name: true,
      handle: true,
      creatorStatus: true,
      heightCm: true,
      showHeight: true,
    },
  },
  images: {
    orderBy: { sortOrder: "asc" },
    select: { url: true, imageAsset: { select: RESPONSIVE_IMAGE_ASSET_SELECT } },
  },
  taggedProducts: {
    where: { reviewStatus: TagReviewStatus.APPROVED },
    include: {
      product: {
        include: {
          brand: { select: { name: true } },
          categories: { select: { slug: true, name: true } },
        },
      },
    },
  },
  hashtags: { select: { tag: true } },
} as const;

type LookWithFeedRelations = Prisma.CreatorLookGetPayload<{ include: typeof feedRelationsInclude }>;

const toFeedPost = (
  {
    id,
    creator,
    imageUrl,
    images,
    layout,
    caption,
    likeCount,
    commentCount,
    saveCount,
    creatorId,
    taggedProducts,
    hashtags,
    createdAt,
  }: LookWithFeedRelations,
  viewer: { likedIds: Set<string>; savedIds: Set<string>; followingIds: Set<string> },
  trendingIds: ReadonlySet<string>,
): CreatorLookFeedPost => ({
  id,
  creator: {
    id: creator.id,
    name: creator.name,
    handle: creator.handle,
    isApproved: creator.creatorStatus === CreatorStatus.APPROVED,
    heightCm: creator.showHeight ? creator.heightCm : null,
  },
  imageUrl,
  images: images.length > 0 ? images.map((image) => image.url) : [imageUrl],
  image: toResponsiveImage(imageUrl, images[0]?.imageAsset ?? null),
  layout,
  caption,
  likeCount,
  commentCount,
  saveCount,
  isLiked: viewer.likedIds.has(id),
  isSaved: viewer.savedIds.has(id),
  isFollowingCreator: viewer.followingIds.has(creatorId),
  taggedProducts: taggedProducts.map(({ product, sizeWorn }) => ({
    id: product.id,
    name: product.name,
    brand: product.brand.name,
    price: product.price,
    imageUrl: product.imageUrl,
    sizeWorn,
  })),
  hashtags: hashtags.map((hashtag) => hashtag.tag),
  createdAt,
  isTrending: trendingIds.has(id),
});

export const hydrateFeedPosts = async (
  orderedIds: string[],
  viewerId: string | undefined,
  trendingIds: ReadonlySet<string> = new Set(),
): Promise<CreatorLookFeedPost[]> => {
  if (orderedIds.length === 0) return [];

  const [looks, likedRows, savedRows] = await Promise.all([
    prisma.creatorLook.findMany({
      where: {
        id: { in: orderedIds },
        deletedAt: null,
        creator: { accountStatus: AccountStatus.ACTIVE },
      },
      include: feedRelationsInclude,
    }),
    viewerId
      ? prisma.creatorLookLike.findMany({
          where: { userId: viewerId, creatorLookId: { in: orderedIds } },
          select: { creatorLookId: true },
        })
      : [],
    viewerId
      ? prisma.creatorLookSave.findMany({
          where: { userId: viewerId, creatorLookId: { in: orderedIds } },
          select: { creatorLookId: true },
        })
      : [],
  ]);

  const creatorIds = [...new Set(looks.map((look) => look.creatorId))];
  const followingRows =
    viewerId && creatorIds.length > 0
      ? await prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: creatorIds } },
          select: { followingId: true },
        })
      : [];

  const viewer = {
    likedIds: new Set(likedRows.map((row) => row.creatorLookId)),
    savedIds: new Set(savedRows.map((row) => row.creatorLookId)),
    followingIds: new Set(followingRows.map((row) => row.followingId)),
  };

  const byId = new Map(looks.map((look) => [look.id, look]));
  return orderedIds
    .map((id) => byId.get(id))
    .filter((look): look is LookWithFeedRelations => Boolean(look))
    .map((look) => toFeedPost(look, viewer, trendingIds));
};
