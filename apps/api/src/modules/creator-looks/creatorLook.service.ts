import { DomainEvents, eventBus } from "#events/event-bus.js";
import { CreatorStatus, FollowTargetType } from "#generated/prisma/enums.js";
import { extractHashtags } from "#lib/hashtags.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { followRepository } from "#modules/follows/follow.repository.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";
import type { PublicProduct } from "#modules/products/product.types.js";
import { toPublicProduct } from "#modules/products/product.utils.js";
import { userRepository } from "#modules/users/user.repository.js";

import { creatorLookRepository } from "./creatorLook.repository.js";
import type {
  CreateCreatorLookBody,
  ListCreatorLooksQuery,
  ListSavedQuery,
  TagClickBody,
} from "./creatorLook.schemas.js";
import type {
  CommentPage,
  CreatorLookSummary,
  CreatorLookSummaryPage,
  FeedPage,
  TaggedProductPage,
  TrendingTag,
} from "./creatorLook.types.js";

const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;
const UNAUTHORIZED_STATUS = 401;
const VALIDATION_STATUS = 422;

const FOLLOWING_TAB = "following";
const TRENDING_TAB = "trending";
const FOR_YOU_TAB = "for_you";

const requireActiveLook = async (lookId: string): Promise<{ id: string }> => {
  const look = await creatorLookRepository.findActiveById(lookId);
  if (!look) throw new AppError("LOOK_NOT_FOUND", "This look no longer exists.", NOT_FOUND_STATUS);
  return look;
};

const requireApprovedCreator = async (userId: string): Promise<void> => {
  const user = await userRepository.findById(userId);
  if (!user || !user.isCreator || user.creatorStatus !== CreatorStatus.APPROVED) {
    throw new AppError("NOT_A_CREATOR", "Only approved creators can post looks.", FORBIDDEN_STATUS);
  }
};

const requireApprovedProducts = async (productIds: string[]): Promise<void> => {
  const products = await productRepository.findApprovedByIds(productIds);
  if (products.length !== productIds.length) {
    throw new AppError(
      "PRODUCT_NOT_AVAILABLE",
      "One or more tagged products aren't available.",
      NOT_FOUND_STATUS,
    );
  }
};

export const creatorLookService = {
  async create(
    userId: string,
    { taggedProducts, imageUrls, caption }: CreateCreatorLookBody,
  ): Promise<CreatorLookSummary> {
    await requireApprovedCreator(userId);
    const productIds = taggedProducts.map((tag) => tag.productId);
    await requireApprovedProducts(productIds);

    const [coverImageUrl, ...restImageUrls] = imageUrls;
    if (!coverImageUrl) {
      throw new AppError("VALIDATION_ERROR", "At least one image is required.", VALIDATION_STATUS);
    }

    const look = await creatorLookRepository.create({
      creatorId: userId,
      imageUrls: [coverImageUrl, ...restImageUrls],
      caption,
      taggedProducts,
      hashtags: extractHashtags(caption ?? ""),
    });

    await Promise.all(productIds.map((productId) => productService.recountWornBy(productId)));

    eventBus.emit(DomainEvents.LOOK_CREATED, {
      lookId: look.id,
      creatorId: userId,
      createdAt: look.createdAt,
    });

    return look;
  },

  async listMine(userId: string, query: ListCreatorLooksQuery): Promise<CreatorLookSummaryPage> {
    return creatorLookRepository.listByCreatorId(userId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  },

  async listMySaved(userId: string, query: ListSavedQuery): Promise<FeedPage> {
    return creatorLookRepository.listSaved(userId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  },

  async listPublic(query: ListCreatorLooksQuery): Promise<TaggedProductPage<PublicProduct>> {
    const page = await creatorLookRepository.listPublicTaggedProducts(query);
    return { products: page.products.map(toPublicProduct), nextCursor: page.nextCursor };
  },

  async listPublicByCreator(
    creatorId: string,
    query: ListCreatorLooksQuery,
    viewerId?: string,
  ): Promise<FeedPage> {
    return creatorLookRepository.feedByCreatorId({
      creatorId,
      cursor: query.cursor,
      limit: query.limit,
      viewerId,
    });
  },

  async feed(
    viewerId: string | undefined,
    { tab, cursor, limit }: { tab: string; cursor?: string; limit: number },
  ): Promise<FeedPage> {
    if (tab === FOLLOWING_TAB) {
      if (!viewerId) {
        throw new AppError(
          "UNAUTHORIZED",
          "Sign in to see posts from creators you follow.",
          UNAUTHORIZED_STATUS,
        );
      }

      const followingCreatorIds = await followRepository.listFollowingIds(
        viewerId,
        FollowTargetType.USER,
      );
      if (followingCreatorIds.length === 0) {
        // Nobody followed yet: fall back to trending rather than showing an empty feed.
        return creatorLookRepository.feed({
          tab: TRENDING_TAB,
          cursor,
          limit,
          viewerId,
          followingCreatorIds: [],
        });
      }

      return creatorLookRepository.feed({
        tab: FOLLOWING_TAB,
        cursor,
        limit,
        viewerId,
        followingCreatorIds,
      });
    }

    const tabToUse = tab === FOR_YOU_TAB ? TRENDING_TAB : tab;

    return creatorLookRepository.feed({
      tab: tabToUse,
      cursor,
      limit,
      viewerId,
      followingCreatorIds: [],
    });
  },

  async countNewSince(
    viewerId: string | undefined,
    { tab, since }: { tab: string; since: Date },
  ): Promise<number> {
    if (tab === FOLLOWING_TAB) {
      if (!viewerId) return 0;

      const followingCreatorIds = await followRepository.listFollowingIds(
        viewerId,
        FollowTargetType.USER,
      );
      if (followingCreatorIds.length === 0) return 0;

      return creatorLookRepository.countNewSince({
        tab: FOLLOWING_TAB,
        since,
        followingCreatorIds,
      });
    }

    const tabToUse = tab === FOR_YOU_TAB ? TRENDING_TAB : tab;
    return creatorLookRepository.countNewSince({ tab: tabToUse, since, followingCreatorIds: [] });
  },

  async trendingTags(): Promise<TrendingTag[]> {
    return creatorLookRepository.trendingTags();
  },

  async like(lookId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    await requireActiveLook(lookId);
    const { likeCount } = await creatorLookRepository.like(lookId, userId);
    eventBus.emit(DomainEvents.LOOK_LIKED, { lookId, userId });
    return { liked: true, likeCount };
  },

  async unlike(lookId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    await requireActiveLook(lookId);
    const { likeCount } = await creatorLookRepository.unlike(lookId, userId);
    return { liked: false, likeCount };
  },

  async save(lookId: string, userId: string): Promise<{ saved: boolean; saveCount: number }> {
    await requireActiveLook(lookId);
    const { saveCount } = await creatorLookRepository.save(lookId, userId);
    eventBus.emit(DomainEvents.LOOK_SAVED, { lookId, userId });
    return { saved: true, saveCount };
  },

  async unsave(lookId: string, userId: string): Promise<{ saved: boolean; saveCount: number }> {
    await requireActiveLook(lookId);
    const { saveCount } = await creatorLookRepository.unsave(lookId, userId);
    return { saved: false, saveCount };
  },

  async listComments(
    lookId: string,
    query: { cursor?: string; limit: number },
  ): Promise<CommentPage> {
    await requireActiveLook(lookId);
    return creatorLookRepository.listComments(lookId, query);
  },

  async addComment(lookId: string, userId: string, body: string) {
    await requireActiveLook(lookId);
    const comment = await creatorLookRepository.createComment(lookId, userId, body);
    eventBus.emit(DomainEvents.LOOK_COMMENTED, { lookId, commentId: comment.id, userId });
    return comment;
  },

  async recordTagClick(
    lookId: string,
    productId: string,
    userId: string | undefined,
    body: TagClickBody,
  ): Promise<void> {
    await requireActiveLook(lookId);

    const tagged = await creatorLookRepository.tagExists(lookId, productId);
    if (!tagged) {
      throw new AppError(
        "TAG_NOT_FOUND",
        "This product isn't tagged in this look.",
        NOT_FOUND_STATUS,
      );
    }

    await creatorLookRepository.recordTagClick({
      lookId,
      productId,
      userId,
      sessionId: body.sessionId,
      source: body.source,
    });
  },
};
