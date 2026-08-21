import { LRUCache } from "lru-cache";

import { creatorApprovedTemplate, creatorRejectedTemplate } from "#email-templates/templates.js";
import { CreatorStatus, FollowTargetType } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { badgeService } from "#modules/badges/badge.service.js";
import { creatorLookRepository } from "#modules/creator-looks/creatorLook.repository.js";
import { followRepository } from "#modules/follows/follow.repository.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";
import { userRepository } from "#modules/users/user.repository.js";
import type { UserRecord } from "#modules/users/user.types.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { AUTOCOMPLETE_LIMIT } from "./creator.constants.js";
import type {
  AutocompleteQuery,
  ListCreatorsQuery,
  SearchCreatorsQuery,
  UpdateCreatorProfileBody,
} from "./creator.schemas.js";
import type {
  CreatorProfile,
  CreatorProfilePage,
  CreatorSearchCursor,
  CreatorSearchPage,
  CreatorSearchResult,
  PublicCreatorProfile,
} from "./creator.types.js";
import { toProfile, toSearchResult } from "./creator.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

const AUTOCOMPLETE_MEMORY_CACHE_MAX_ENTRIES = 500;
const AUTOCOMPLETE_CACHE_NAMESPACE = "creator-autocomplete";
const MS_PER_SECOND = 1000;

const autocompleteMemoryCache = new LRUCache<string, CreatorSearchResult[]>({
  max: AUTOCOMPLETE_MEMORY_CACHE_MAX_ENTRIES,
  ttl: CACHE_TTL.CREATOR_AUTOCOMPLETE * MS_PER_SECOND,
});

const requireUser = async (userId: string): Promise<UserRecord> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError("USER_NOT_FOUND", "User not found.", NOT_FOUND_STATUS);
  return user;
};

const requirePendingCreator = async (userId: string): Promise<UserRecord> => {
  const user = await requireUser(userId);
  if (user.creatorStatus !== CreatorStatus.PENDING) {
    throw new AppError(
      "NOT_PENDING",
      "This creator application is not pending review.",
      CONFLICT_STATUS,
    );
  }
  return user;
};

export const creatorService = {
  async apply(userId: string): Promise<CreatorProfile> {
    const user = await requireUser(userId);

    if (
      user.creatorStatus === CreatorStatus.PENDING ||
      user.creatorStatus === CreatorStatus.APPROVED
    ) {
      throw new AppError(
        "ALREADY_APPLIED",
        "You've already applied to become a creator.",
        CONFLICT_STATUS,
      );
    }

    const updated = await userRepository.updateCreatorStatus(userId, {
      creatorStatus: CreatorStatus.PENDING,
    });

    logger.info(`Creator application submitted: ${userId}`);
    return toProfile(updated);
  },

  async getMine(userId: string): Promise<CreatorProfile> {
    return toProfile(await requireUser(userId));
  },

  async updateMe(userId: string, input: UpdateCreatorProfileBody): Promise<CreatorProfile> {
    await requireUser(userId);
    const updated = await userRepository.updateProfile(userId, input);
    return toProfile(updated);
  },

  async getPublicProfile(handle: string, viewerId?: string): Promise<PublicCreatorProfile> {
    const user = await userRepository.findByHandle(handle);
    if (!user || !user.isCreator) {
      throw new AppError("NOT_FOUND", "Creator not found.", NOT_FOUND_STATUS);
    }

    const {
      id,
      name,
      handle: userHandle,
      avatarUrl,
      heightCm,
      showHeight,
      hideFromLeaderboards,
      creatorStatus,
      followerCount,
      followingCount,
    } = user;

    const [postsCount, taggedProductIds, isFollowing, featuredBadges, titleBadge] =
      await Promise.all([
        creatorLookRepository.countByCreatorId(id),
        productRepository.listProductIdsTaggedByCreator(id),
        viewerId ? followRepository.isFollowing(viewerId, FollowTargetType.USER, id) : false,
        badgeService.listFeaturedForUser(id),
        badgeService.getTitleBadgeForUser(id),
      ]);

    const isOwnProfile = viewerId === id;

    return {
      userId: id,
      name,
      handle: userHandle,
      avatarUrl,
      heightCm: showHeight || isOwnProfile ? heightCm : null,
      showHeight,
      hideFromLeaderboards,
      creatorStatus,
      postsCount,
      followerCount,
      followingCount,
      taggedPiecesCount: taggedProductIds.length,
      isFollowing,
      featuredBadges,
      titleBadge,
    };
  },

  async list(query: ListCreatorsQuery): Promise<CreatorProfilePage> {
    const rows = await userRepository.listByCreatorStatus(query.status, {
      cursor: query.cursor,
      limit: query.limit,
    });

    const { items: pagedCreators, nextCursor } = buildCursorPage(
      rows,
      query.limit,
      (row) => row.id,
    );
    return { creators: pagedCreators.map(toProfile), nextCursor };
  },

  async search({ q, cursor, limit }: SearchCreatorsQuery): Promise<CreatorSearchPage> {
    const offset = decodeCursor<CreatorSearchCursor>(cursor)?.offset ?? 0;
    const { ids, total } = await userRepository.searchCreatorIds(q, { limit, offset });
    const users = await userRepository.findManyByIds(ids);

    const byId = new Map(users.map((user) => [user.id, user]));
    const orderedUsers = ids
      .map((id) => byId.get(id))
      .filter((user): user is UserRecord => user !== undefined);

    const nextOffset = offset + ids.length;
    const nextCursor =
      nextOffset < total ? encodeCursor<CreatorSearchCursor>({ offset: nextOffset }) : null;

    return { creators: orderedUsers.map(toSearchResult), nextCursor, total };
  },

  async autocomplete({ q }: AutocompleteQuery): Promise<CreatorSearchResult[]> {
    const normalizedQuery = q.trim().toLowerCase();

    const memoryHit = autocompleteMemoryCache.get(normalizedQuery);
    if (memoryHit) return memoryHit;

    const cacheKey = redisKeys.cache(AUTOCOMPLETE_CACHE_NAMESPACE, normalizedQuery);
    try {
      const cached = await cacheService.get<CreatorSearchResult[]>(cacheKey);
      if (cached) {
        autocompleteMemoryCache.set(normalizedQuery, cached);
        return cached;
      }
    } catch (error) {
      logger.warn(`Cache read failed for "${cacheKey}": ${describeError(error)}`);
    }

    const { ids } = await userRepository.searchCreatorIds(q, {
      limit: AUTOCOMPLETE_LIMIT,
      offset: 0,
    });
    const users = await userRepository.findManyByIds(ids);
    const byId = new Map(users.map((user) => [user.id, user]));
    const orderedUsers = ids
      .map((id) => byId.get(id))
      .filter((user): user is UserRecord => user !== undefined);

    const suggestions = orderedUsers.map(toSearchResult);

    autocompleteMemoryCache.set(normalizedQuery, suggestions);
    try {
      await cacheService.set(cacheKey, suggestions, CACHE_TTL.CREATOR_AUTOCOMPLETE);
    } catch (error) {
      logger.warn(`Cache write failed for "${cacheKey}": ${describeError(error)}`);
    }

    return suggestions;
  },

  async approve(userId: string, adminUserId: string): Promise<void> {
    const user = await requirePendingCreator(userId);

    await userRepository.updateCreatorStatus(userId, {
      creatorStatus: CreatorStatus.APPROVED,
      isCreator: true,
    });
    await productService.recountWornByForCreator(userId);

    const { subject, html } = creatorApprovedTemplate();
    await sendEmail({
      to: user.email,
      subject,
      body: "Your Outfiqe creator account is approved.",
      html,
    });

    logger.info(`Creator approved: ${userId} by admin ${adminUserId}`);
  },

  async reject(userId: string, adminUserId: string): Promise<void> {
    const user = await requirePendingCreator(userId);

    await userRepository.updateCreatorStatus(userId, {
      creatorStatus: CreatorStatus.REJECTED,
      isCreator: false,
    });

    const { subject, html } = creatorRejectedTemplate();
    await sendEmail({
      to: user.email,
      subject,
      body: "An update on your Outfiqe creator application.",
      html,
    });

    logger.info(`Creator rejected: ${userId} by admin ${adminUserId}`);
  },
};
