import { LRUCache } from "lru-cache";

import { DomainEvents, eventBus } from "#events/event-bus.js";
import { FollowTargetType } from "#generated/prisma/enums.js";
import { requireApprovedCreator } from "#lib/creator-guard.utils.js";
import { extractHashtags } from "#lib/hashtags.utils.js";
import { truncateToHour } from "#lib/trend-scoring.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { followRepository } from "#modules/follows/follow.repository.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import {
  AUTOCOMPLETE_LIMIT,
  TAG_TREND_METRIC_RETENTION_DAYS,
  TREND_METRIC_RETENTION_DAYS,
} from "./creatorLook.constants.js";
import { creatorLookRepository } from "./creatorLook.repository.js";
import type {
  AutocompleteQuery,
  CreateCreatorLookBody,
  ListCreatorLooksQuery,
  ListSavedQuery,
  RecordViewBody,
  SearchCreatorLooksQuery,
  TagClickBody,
} from "./creatorLook.schemas.js";
import type {
  CommentPage,
  CreatorLookEditDetail,
  CreatorLookFeedPost,
  CreatorLookSummary,
  CreatorMomentumEntry,
  FeedPage,
  LookSearchPage,
  PostSuggestion,
  PostTrendingEntry,
  TagScoreBreakdown,
  TrendingTag,
} from "./creatorLook.types.js";
import { isLikelyBotUserAgent, toSuggestion } from "./creatorLook.utils.js";

const NOT_FOUND_STATUS = 404;
const UNAUTHORIZED_STATUS = 401;

const AUTOCOMPLETE_MEMORY_CACHE_MAX_ENTRIES = 500;
const AUTOCOMPLETE_CACHE_NAMESPACE = "look-autocomplete";
const MS_PER_SECOND = 1000;

const autocompleteMemoryCache = new LRUCache<string, PostSuggestion[]>({
  max: AUTOCOMPLETE_MEMORY_CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL.LOOK_AUTOCOMPLETE * MS_PER_SECOND,
});
const VALIDATION_STATUS = 422;

const FOLLOWING_TAB = "following";
const TRENDING_TAB = "trending";
const FOR_YOU_TAB = "for_you";

const requireActiveLook = async (lookId: string): Promise<{ id: string; creatorId: string }> => {
  const look = await creatorLookRepository.findActiveById(lookId);
  if (!look) throw new AppError("LOOK_NOT_FOUND", "This look no longer exists.", NOT_FOUND_STATUS);
  return look;
};

const requireOwnedLook = async (lookId: string, userId: string): Promise<CreatorLookEditDetail> => {
  const look = await creatorLookRepository.findOwnedById(lookId, userId);
  if (!look) throw new AppError("LOOK_NOT_FOUND", "This post no longer exists.", NOT_FOUND_STATUS);
  return look;
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
    await requireApprovedCreator(userId, "Only approved creators can post looks.");
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

    await eventBus.publish(DomainEvents.LOOK_CREATED, {
      lookId: look.id,
      creatorId: userId,
      createdAt: look.createdAt.toISOString(),
    });
    for (const productId of productIds) {
      await eventBus.publish(DomainEvents.PRODUCT_TAGGED, {
        lookId: look.id,
        creatorId: userId,
        productId,
      });
    }

    return look;
  },

  async getOwn(lookId: string, userId: string): Promise<CreatorLookEditDetail> {
    return requireOwnedLook(lookId, userId);
  },

  async update(
    lookId: string,
    userId: string,
    body: CreateCreatorLookBody,
  ): Promise<CreatorLookSummary> {
    const existing = await requireOwnedLook(lookId, userId);
    const newProductIds = body.taggedProducts.map((tag) => tag.productId);
    await requireApprovedProducts(newProductIds);

    const [coverImageUrl, ...restImageUrls] = body.imageUrls;
    if (!coverImageUrl) {
      throw new AppError("VALIDATION_ERROR", "At least one image is required.", VALIDATION_STATUS);
    }

    const updated = await creatorLookRepository.update(lookId, {
      imageUrls: [coverImageUrl, ...restImageUrls],
      caption: body.caption,
      taggedProducts: body.taggedProducts,
      hashtags: extractHashtags(body.caption ?? ""),
    });

    const oldProductIds = existing.taggedProducts.map((tag) => tag.productId);
    const affectedProductIds = [...new Set([...oldProductIds, ...newProductIds])];
    await Promise.all(
      affectedProductIds.map((productId) => productService.recountWornBy(productId)),
    );

    const addedProductIds = newProductIds.filter((productId) => !oldProductIds.includes(productId));
    for (const productId of addedProductIds) {
      await eventBus.publish(DomainEvents.PRODUCT_TAGGED, { lookId, creatorId: userId, productId });
    }

    return updated;
  },

  async remove(lookId: string, userId: string): Promise<void> {
    const existing = await requireOwnedLook(lookId, userId);
    await creatorLookRepository.softDelete(lookId);

    await Promise.all(
      existing.taggedProducts.map((tag) => productService.recountWornBy(tag.productId)),
    );
  },

  async listMySaved(userId: string, query: ListSavedQuery): Promise<FeedPage> {
    return creatorLookRepository.listSaved(userId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  },

  async listPublic(query: ListCreatorLooksQuery): Promise<FeedPage> {
    return creatorLookRepository.listFeaturedLooks(query);
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

  async getPublicById(lookId: string, viewerId: string | undefined): Promise<CreatorLookFeedPost> {
    await requireActiveLook(lookId);
    const post = await creatorLookRepository.findPublicById(lookId, viewerId);
    if (!post) throw new AppError("NOT_FOUND", "Post not found.", NOT_FOUND_STATUS);
    return post;
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

    if (tab === FOR_YOU_TAB) {
      const followedCreatorIds = viewerId
        ? await followRepository.listFollowingIds(viewerId, FollowTargetType.USER)
        : [];

      return creatorLookRepository.feed({
        tab: FOR_YOU_TAB,
        cursor,
        limit,
        viewerId,
        followingCreatorIds: followedCreatorIds,
      });
    }

    return creatorLookRepository.feed({
      tab,
      cursor,
      limit,
      viewerId,
      followingCreatorIds: [],
    });
  },

  async search(
    viewerId: string | undefined,
    { q, cursor, limit }: SearchCreatorLooksQuery,
  ): Promise<LookSearchPage> {
    return creatorLookRepository.searchLooks(q, { cursor, limit }, viewerId);
  },

  async autocomplete({ q }: AutocompleteQuery): Promise<PostSuggestion[]> {
    const normalizedQuery = q.trim().toLowerCase();

    const memoryHit = autocompleteMemoryCache.get(normalizedQuery);
    if (memoryHit) return memoryHit;

    const cacheKey = redisKeys.cache(AUTOCOMPLETE_CACHE_NAMESPACE, normalizedQuery);
    try {
      const cached = await cacheService.get<PostSuggestion[]>(cacheKey);
      if (cached) {
        autocompleteMemoryCache.set(normalizedQuery, cached);
        return cached;
      }
    } catch (error) {
      logger.warn(`Cache read failed for "${cacheKey}": ${describeError(error)}`);
    }

    const posts = await creatorLookRepository.searchLookSuggestions(q, AUTOCOMPLETE_LIMIT);
    const suggestions = posts.map(toSuggestion);

    autocompleteMemoryCache.set(normalizedQuery, suggestions);
    try {
      await cacheService.set(cacheKey, suggestions, CACHE_TTL.LOOK_AUTOCOMPLETE);
    } catch (error) {
      logger.warn(`Cache write failed for "${cacheKey}": ${describeError(error)}`);
    }

    return suggestions;
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

  async runTrendingAggregation(): Promise<{ bucketStart: Date; deletedBuckets: number }> {
    const bucketStart = truncateToHour(new Date());
    await creatorLookRepository.upsertHourlyPostMetrics(bucketStart);

    const retentionCutoff = new Date(
      Date.now() - TREND_METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const deletedBuckets = await creatorLookRepository.deleteTrendMetricsOlderThan(retentionCutoff);

    return { bucketStart, deletedBuckets };
  },

  async runTrendingScoring(): Promise<{ ranked: PostTrendingEntry[] }> {
    const { postScores, creatorMomentum } =
      await creatorLookRepository.computeRankedTrendingScoreAndCreatorMomentum();
    await Promise.all([
      creatorLookRepository.cacheRankedTrendingScore(postScores),
      creatorLookRepository.cacheRankedCreatorMomentumScores(creatorMomentum),
    ]);
    return { ranked: postScores };
  },

  async runCreatorMomentumScoring(): Promise<{ ranked: CreatorMomentumEntry[] }> {
    const ranked = await creatorLookRepository.computeRankedCreatorMomentumScores();
    await creatorLookRepository.cacheRankedCreatorMomentumScores(ranked);
    return { ranked };
  },

  async runTagTrendingAggregation(): Promise<{ bucketStart: Date; deletedBuckets: number }> {
    const bucketStart = truncateToHour(new Date());
    await creatorLookRepository.upsertHourlyTagMetrics(bucketStart);

    const retentionCutoff = new Date(
      Date.now() - TAG_TREND_METRIC_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    );
    const deletedBuckets =
      await creatorLookRepository.deleteTagTrendMetricsOlderThan(retentionCutoff);

    return { bucketStart, deletedBuckets };
  },

  async runTagTrendingScoring(): Promise<{ ranked: TagScoreBreakdown[] }> {
    const ranked = await creatorLookRepository.computeRankedTrendingTags();
    await creatorLookRepository.cacheRankedTrendingTags(ranked);
    return { ranked };
  },

  async like(lookId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const look = await requireActiveLook(lookId);
    const { likeCount } = await creatorLookRepository.like(lookId, userId);
    await eventBus.publish(DomainEvents.LOOK_LIKED, { lookId, creatorId: look.creatorId, userId });
    return { liked: true, likeCount };
  },

  async unlike(lookId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    const look = await requireActiveLook(lookId);
    const { likeCount, unliked } = await creatorLookRepository.unlike(lookId, userId);
    if (unliked) {
      await eventBus.publish(DomainEvents.LOOK_UNLIKED, {
        lookId,
        creatorId: look.creatorId,
        userId,
      });
    }
    return { liked: false, likeCount };
  },

  async save(lookId: string, userId: string): Promise<{ saved: boolean; saveCount: number }> {
    const look = await requireActiveLook(lookId);
    const { saveCount } = await creatorLookRepository.save(lookId, userId);
    await eventBus.publish(DomainEvents.LOOK_SAVED, { lookId, creatorId: look.creatorId, userId });
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
    const look = await requireActiveLook(lookId);
    const comment = await creatorLookRepository.createComment(lookId, userId, body);
    await eventBus.publish(DomainEvents.LOOK_COMMENTED, {
      lookId,
      creatorId: look.creatorId,
      commentId: comment.id,
      userId,
    });
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

  async recordView(
    lookId: string,
    viewerId: string | undefined,
    userAgent: string | undefined,
    body: RecordViewBody,
  ): Promise<void> {
    const look = await requireActiveLook(lookId);
    if (viewerId === look.creatorId) return;
    if (isLikelyBotUserAgent(userAgent)) return;

    const { counted } = await creatorLookRepository.recordView({
      lookId,
      viewerId,
      sessionId: body.sessionId,
    });
    if (!counted) return;

    await eventBus.publish(DomainEvents.LOOK_VIEWED, {
      lookId,
      creatorId: look.creatorId,
      viewerId,
    });
  },
};
