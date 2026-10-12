import { LRUCache } from "lru-cache";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { FollowTargetType } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { followRepository } from "#modules/follows/follow.repository.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { AUTOCOMPLETE_LIMIT } from "../creator-look.constants.js";
import { requireActiveLook } from "../creator-look.guards.js";
import type {
  AutocompleteQuery,
  ListCreatorLooksQuery,
  ListSavedQuery,
  SearchCreatorLooksQuery,
} from "../creator-look.schemas.js";
import type {
  CreatorLookFeedPost,
  FeedPage,
  LookSearchPage,
  PostSuggestion,
} from "../creator-look.types.js";
import { toSuggestion } from "../creator-look.utils.js";
import { creatorLookFeedRepository } from "./feed.repository.js";

const AUTOCOMPLETE_MEMORY_CACHE_MAX_ENTRIES = 500;
const AUTOCOMPLETE_CACHE_NAMESPACE = "look-autocomplete";
const MS_PER_SECOND = 1000;

const autocompleteMemoryCache = new LRUCache<string, PostSuggestion[]>({
  max: AUTOCOMPLETE_MEMORY_CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL.LOOK_AUTOCOMPLETE * MS_PER_SECOND,
});

const FOLLOWING_TAB = "following";
const TRENDING_TAB = "trending";
const FOR_YOU_TAB = "for_you";

export const creatorLookFeedService = {
  async listMySaved(userId: string, query: ListSavedQuery): Promise<FeedPage> {
    return creatorLookFeedRepository.listSaved(userId, {
      cursor: query.cursor,
      limit: query.limit,
    });
  },

  async listPublic(query: ListCreatorLooksQuery): Promise<FeedPage> {
    return creatorLookFeedRepository.listFeaturedLooks(query);
  },

  async listPublicByCreator(
    creatorId: string,
    query: ListCreatorLooksQuery,
    viewerId?: string,
  ): Promise<FeedPage> {
    return creatorLookFeedRepository.feedByCreatorId({
      creatorId,
      cursor: query.cursor,
      limit: query.limit,
      viewerId,
    });
  },

  async getPublicById(lookId: string, viewerId: string | undefined): Promise<CreatorLookFeedPost> {
    await requireActiveLook(lookId);
    const post = await creatorLookFeedRepository.findPublicById(lookId, viewerId);
    if (!post) throw new AppError("NOT_FOUND", "Drop not found.", HTTP_STATUS.NOT_FOUND);
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
          "Sign in to see drops from muses you follow.",
          HTTP_STATUS.UNAUTHORIZED,
        );
      }

      const followingCreatorIds = await followRepository.listFollowingIds(
        viewerId,
        FollowTargetType.USER,
      );
      if (followingCreatorIds.length === 0) {
        return { posts: [], nextCursor: null };
      }

      return creatorLookFeedRepository.feed({
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

      return creatorLookFeedRepository.feed({
        tab: FOR_YOU_TAB,
        cursor,
        limit,
        viewerId,
        followingCreatorIds: followedCreatorIds,
      });
    }

    return creatorLookFeedRepository.feed({
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
    return creatorLookFeedRepository.searchLooks(q, { cursor, limit }, viewerId);
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

    const posts = await creatorLookFeedRepository.searchLookSuggestions(q, AUTOCOMPLETE_LIMIT);
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

      return creatorLookFeedRepository.countNewSince({
        tab: FOLLOWING_TAB,
        since,
        followingCreatorIds,
      });
    }

    const tabToUse = tab === FOR_YOU_TAB ? TRENDING_TAB : tab;
    return creatorLookFeedRepository.countNewSince({
      tab: tabToUse,
      since,
      followingCreatorIds: [],
    });
  },
};
