import { PUBLIC_BUILD_SORT, type PublicBuildSort } from "@outfiqe/utils";
import { z } from "zod";

import { prisma } from "#db/prisma.js";
import { OutfitPhotoKind, OutfitVisibility } from "#generated/prisma/enums.js";
import { assertContentAllowed } from "#lib/content-check.utils.js";
import { assertCanEngage } from "#lib/engagement-guard.utils.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";
import { CONTENT_MODERATE_PERMISSION_KEY } from "#modules/platform-access/platform-access.constants.js";
import { platformAccessService } from "#modules/platform-access/platform-access.service.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { OUTFIT_LIMITS } from "./outfit.constants.js";
import { outfitErrors } from "./outfit.errors.js";
import { outfitRepository } from "./outfit.repository.js";
import type { OutfitPersonView } from "./outfit.types.js";
import { parseSnapshotItems, toPublicFeedCursorValue } from "./outfit.utils.js";
import { outfitCartRepository } from "./outfit-cart.repository.js";
import { outfitPhotoRepository } from "./outfit-photo.repository.js";
import { loadCoversForBuilds } from "./outfit-photo.service.js";
import type { OutfitPhotoView } from "./outfit-photo.types.js";
import { toOutfitPhotoView } from "./outfit-photo.utils.js";
import {
  type OutfitCommentRow,
  outfitSocialRepository,
  type PublicBuildFilters,
  type PublicFeedCursor,
} from "./outfit-social.repository.js";
import type {
  ModerationPrincipal,
  OutfitCommentPage,
  OutfitCommentView,
  PublicBuildCard,
  PublicBuildDetail,
  PublicBuildPage,
} from "./outfit-social.types.js";

const LOOKAHEAD_ROW = 1;
const NO_STOCK = 0;
const OUTFIT_AUDIT_TARGET_TYPE = "Outfit";
const OUTFIT_COMMENT_AUDIT_TARGET_TYPE = "OutfitComment";

const SOCIAL_ACCESS = {
  PUBLIC: "PUBLIC",
  AUDIENCE: "AUDIENCE",
} as const;

type SocialAccess = (typeof SOCIAL_ACCESS)[keyof typeof SOCIAL_ACCESS];

const WHOLE_NUMBER_TEXT_PATTERN = /^\d+$/;

const publicFeedCursorSchema = z.discriminatedUnion("sort", [
  z.object({ sort: z.literal(PUBLIC_BUILD_SORT.NEWEST), value: z.iso.datetime(), id: z.uuid() }),
  z.object({
    sort: z.enum([
      PUBLIC_BUILD_SORT.MOST_CHERIQED,
      PUBLIC_BUILD_SORT.PRICE_LOW,
      PUBLIC_BUILD_SORT.PRICE_HIGH,
    ]),
    value: z.string().regex(WHOLE_NUMBER_TEXT_PATTERN),
    id: z.uuid(),
  }),
]);

const toMatchingFeedCursor = (
  encodedCursor: string | undefined,
  sort: PublicBuildSort,
): PublicFeedCursor | undefined => {
  const parsedCursor = publicFeedCursorSchema.safeParse(
    decodeCursor<PublicFeedCursor>(encodedCursor),
  );
  return parsedCursor.success && parsedCursor.data.sort === sort ? parsedCursor.data : undefined;
};

type LoadedPublicBuild = Awaited<
  ReturnType<typeof outfitSocialRepository.loadPublicBuilds>
>[number];

const resolveSocialAccess = async (
  outfitId: string,
  viewerId: string | null,
): Promise<SocialAccess | null> => {
  const target = await outfitSocialRepository.findSocialTarget(outfitId);
  if (!target || target.removedAt !== null || target.publishedVersion === null) return null;

  if (target.visibility === OutfitVisibility.PUBLIC) {
    const isPublicFeedOn = await featureFlagsService.isEnabledForUser(
      "outfit_public_feed",
      viewerId,
    );
    return isPublicFeedOn ? SOCIAL_ACCESS.PUBLIC : null;
  }
  if (target.visibility !== OutfitVisibility.SHARED || viewerId === null) return null;

  const [isBuildOn, memberRole, isRecipient] = await Promise.all([
    featureFlagsService.isEnabledForUser("outfit_builder", viewerId),
    outfitRepository.findMemberRole(prisma, outfitId, viewerId),
    outfitSocialRepository.isShareRecipient(outfitId, viewerId),
  ]);
  return isBuildOn && (memberRole !== null || isRecipient) ? SOCIAL_ACCESS.AUDIENCE : null;
};

export const requireSocialAccess = async (
  outfitId: string,
  viewerId: string | null,
): Promise<SocialAccess> => {
  const access = await resolveSocialAccess(outfitId, viewerId);
  if (!access) throw outfitErrors.notFound();
  return access;
};

const isModerator = (principal: ModerationPrincipal): Promise<boolean> =>
  platformAccessService.principalHasPermission(principal, CONTENT_MODERATE_PERMISSION_KEY);

const toCommentView = (comment: OutfitCommentRow, viewerId: string | null): OutfitCommentView => ({
  id: comment.id,
  body: comment.body,
  author: comment.user,
  parentCommentId: comment.parentCommentId,
  replyCount: comment.replyCount,
  createdAt: comment.createdAt.toISOString(),
  isMine: comment.userId === viewerId,
});

const buildCards = async (
  builds: LoadedPublicBuild[],
  viewerId: string | null,
): Promise<{ card: PublicBuildCard; build: LoadedPublicBuild }[]> => {
  const publishedSnapshots = builds.flatMap((build) => {
    const snapshot = build.snapshots.find(({ version }) => version === build.publishedVersion);
    return snapshot ? [{ build, snapshot, items: parseSnapshotItems(snapshot.items) }] : [];
  });
  const productIds = [
    ...new Set(publishedSnapshots.flatMap(({ items }) => items.map(({ productId }) => productId))),
  ];
  const contributorIds = [
    ...new Set(publishedSnapshots.flatMap(({ snapshot }) => snapshot.contributorIds)),
  ];
  const outfitIds = publishedSnapshots.map(({ build }) => build.id);

  const [inStockProductIds, people, reactions, coversByOutfitId] = await Promise.all([
    outfitSocialRepository.listProductStock(productIds),
    outfitRepository.findPeople(prisma, contributorIds),
    viewerId
      ? outfitSocialRepository.listViewerReactions(viewerId, outfitIds)
      : Promise.resolve({ likedOutfitIds: new Set<string>(), savedOutfitIds: new Set<string>() }),
    loadCoversForBuilds(viewerId, outfitIds),
  ]);
  const personById = new Map<string, OutfitPersonView>(people.map((person) => [person.id, person]));

  return publishedSnapshots.map(({ build, snapshot, items }) => ({
    build,
    card: {
      id: build.id,
      title: build.title,
      previewImageUrls: items
        .flatMap(({ imageUrl }) => (imageUrl ? [imageUrl] : []))
        .slice(0, OUTFIT_LIMITS.CARD_PREVIEW_PRODUCT_COUNT),
      coverPhotos: coversByOutfitId.get(build.id) ?? [],
      itemCount: items.length,
      total: snapshot.total,
      isFullyAvailable: items.every(({ productId }) => inStockProductIds.has(productId)),
      contributors: snapshot.contributorIds.flatMap((contributorId) => {
        const person = personById.get(contributorId);
        return person ? [person] : [];
      }),
      likeCount: build.likeCount,
      saveCount: build.saveCount,
      commentCount: build.commentCount,
      isLiked: reactions.likedOutfitIds.has(build.id),
      isSaved: reactions.savedOutfitIds.has(build.id),
      madePublicAt: build.madePublicAt?.toISOString() ?? null,
    },
  }));
};

const listVisiblePhotos = async (
  outfitId: string,
  viewerId: string | null,
): Promise<OutfitPhotoView[]> => {
  const [isPhotosOn, isTryOnOn] = await Promise.all([
    featureFlagsService.isEnabledForUser("outfit_photos", viewerId),
    featureFlagsService.isEnabledForUser("outfit_try_on", viewerId),
  ]);
  if (!isPhotosOn) return [];
  const photoRows = await outfitPhotoRepository.listForBoard(prisma, outfitId);
  return photoRows
    .filter(({ kind }) => isTryOnOn || kind !== OutfitPhotoKind.TRY_ON)
    .map(toOutfitPhotoView);
};

const loadCardsInOrder = async (
  outfitIds: string[],
  viewerId: string | null,
): Promise<PublicBuildCard[]> => {
  const builds = await outfitSocialRepository.loadPublicBuilds(outfitIds);
  const cards = await buildCards(builds, viewerId);
  const cardById = new Map(cards.map(({ card }) => [card.id, card]));
  return outfitIds.flatMap((outfitId) => {
    const card = cardById.get(outfitId);
    return card ? [card] : [];
  });
};

export const outfitSocialService = {
  async listPublicBuilds(
    viewerId: string | null,
    filters: PublicBuildFilters,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<PublicBuildPage> {
    const { sort } = filters;
    const rows = await outfitSocialRepository.listPublicBuildIds(
      filters,
      toMatchingFeedCursor(cursor, sort),
      limit + LOOKAHEAD_ROW,
    );
    const { items, nextCursor } = buildCursorPage(rows, limit, (row) =>
      encodeCursor({ sort, value: toPublicFeedCursorValue(row, sort), id: row.id }),
    );
    return {
      items: await loadCardsInOrder(
        items.map(({ id }) => id),
        viewerId,
      ),
      nextCursor,
    };
  },

  async listSavedBuilds(
    viewerId: string,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<PublicBuildPage> {
    const rows = await outfitSocialRepository.listSavedBuildIds(
      viewerId,
      cursor,
      limit + LOOKAHEAD_ROW,
    );
    const { items, nextCursor } = buildCursorPage(rows, limit, ({ outfitId }) => outfitId);
    return {
      items: await loadCardsInOrder(
        items.map(({ outfitId }) => outfitId),
        viewerId,
      ),
      nextCursor,
    };
  },

  async getPublicBuild(viewerId: string | null, outfitId: string): Promise<PublicBuildDetail> {
    await requireSocialAccess(outfitId, viewerId);
    const [cardWithBuild] = await buildCards(
      await outfitSocialRepository.loadPublicBuilds([outfitId]),
      viewerId,
    );
    if (!cardWithBuild) throw outfitErrors.notFound();

    const { card, build } = cardWithBuild;
    const snapshot = build.snapshots.find(({ version }) => version === build.publishedVersion);
    if (!snapshot) throw outfitErrors.notFound();
    const items = parseSnapshotItems(snapshot.items);
    const [buyableSizes, photos] = await Promise.all([
      outfitCartRepository.listBuyableSizes(items.map(({ productId }) => productId)),
      listVisiblePhotos(outfitId, viewerId),
    ]);
    const sizesFor = (productId: string) =>
      buyableSizes
        .filter((size) => size.productId === productId)
        .map(({ label, stock }) => ({ label, isInStock: stock > NO_STOCK }));
    return {
      ...card,
      visibility: build.visibility === OutfitVisibility.PUBLIC ? "PUBLIC" : "SHARED",
      items: items.map((item) => {
        const sizes = sizesFor(item.productId);
        return { ...item, sizes, isInStock: sizes.some(({ isInStock }) => isInStock) };
      }),
      lockedAt: snapshot.createdAt.toISOString(),
      photos,
      canComment: viewerId !== null,
    };
  },

  async setLiked(viewerId: string, outfitId: string, isLiked: boolean) {
    await assertCanEngage(viewerId);
    await requireSocialAccess(outfitId, viewerId);
    const likeCount = isLiked
      ? await outfitSocialRepository.like(outfitId, viewerId)
      : await outfitSocialRepository.unlike(outfitId, viewerId);
    return { isLiked, likeCount };
  },

  async setSaved(viewerId: string, outfitId: string, isSaved: boolean) {
    await assertCanEngage(viewerId);
    await requireSocialAccess(outfitId, viewerId);
    const saveCount = isSaved
      ? await outfitSocialRepository.save(outfitId, viewerId)
      : await outfitSocialRepository.unsave(outfitId, viewerId);
    return { isSaved, saveCount };
  },

  async listComments(
    viewerId: string | null,
    outfitId: string,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<OutfitCommentPage> {
    await requireSocialAccess(outfitId, viewerId);
    const rows = await outfitSocialRepository.listTopLevelComments(
      outfitId,
      cursor,
      limit + LOOKAHEAD_ROW,
    );
    const { items, nextCursor } = buildCursorPage(rows, limit, ({ id }) => id);
    return { items: items.map((row) => toCommentView(row, viewerId)), nextCursor };
  },

  async listReplies(
    viewerId: string | null,
    outfitId: string,
    commentId: string,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<OutfitCommentPage> {
    await requireSocialAccess(outfitId, viewerId);
    const parent = await outfitSocialRepository.findComment(commentId);
    if (!parent || parent.outfitId !== outfitId) throw outfitErrors.commentNotFound();
    const rows = await outfitSocialRepository.listReplies(commentId, cursor, limit + LOOKAHEAD_ROW);
    const { items, nextCursor } = buildCursorPage(rows, limit, ({ id }) => id);
    return { items: items.map((row) => toCommentView(row, viewerId)), nextCursor };
  },

  async addComment(
    viewerId: string,
    outfitId: string,
    { body, parentCommentId }: { body: string; parentCommentId?: string },
  ): Promise<OutfitCommentView> {
    await assertCanEngage(viewerId);
    await requireSocialAccess(outfitId, viewerId);
    assertContentAllowed(body);
    if (parentCommentId) {
      const parent = await outfitSocialRepository.findComment(parentCommentId);
      if (!parent || parent.outfitId !== outfitId) throw outfitErrors.commentNotFound();
      if (parent.parentCommentId !== null) throw outfitErrors.replyToReply();
    }
    const comment = await outfitSocialRepository.createComment({
      outfitId,
      userId: viewerId,
      body,
      parentCommentId: parentCommentId ?? null,
    });
    return toCommentView(comment, viewerId);
  },

  async removeComment(
    principal: ModerationPrincipal,
    outfitId: string,
    commentId: string,
  ): Promise<void> {
    const comment = await outfitSocialRepository.findComment(commentId);
    if (!comment || comment.outfitId !== outfitId) throw outfitErrors.commentNotFound();

    const isAuthor = comment.userId === principal.userId;
    const ownerRole = isAuthor
      ? null
      : await outfitRepository.findMemberRole(prisma, outfitId, principal.userId);
    const isBuildMember = ownerRole !== null;
    const isRemovingAsModerator = !isAuthor && !isBuildMember && (await isModerator(principal));
    if (!isAuthor && !isBuildMember && !isRemovingAsModerator) {
      throw outfitErrors.commentNotFound();
    }

    await outfitSocialRepository.softDeleteComment(commentId, new Date());
    if (isRemovingAsModerator) {
      await platformAudit.record({
        actorUserId: principal.userId,
        action: PLATFORM_AUDIT_ACTION.OUTFIT_BUILD_COMMENT_REMOVED_BY_ADMIN,
        summary: `Removed a chime by ${comment.userId} on a build`,
        onBehalfOfUserId: comment.userId,
        targetType: OUTFIT_COMMENT_AUDIT_TARGET_TYPE,
        targetId: commentId,
        metadata: { outfitId },
      });
    }
  },

  async removeBuild(principal: ModerationPrincipal, outfitId: string): Promise<void> {
    if (!(await isModerator(principal))) throw outfitErrors.notFound();
    const isRemoved = await outfitSocialRepository.markRemoved(outfitId, new Date());
    if (!isRemoved) throw outfitErrors.notFound();
    await platformAudit.record({
      actorUserId: principal.userId,
      action: PLATFORM_AUDIT_ACTION.OUTFIT_BUILD_REMOVED_BY_ADMIN,
      summary: "Removed a build from public view",
      targetType: OUTFIT_AUDIT_TARGET_TYPE,
      targetId: outfitId,
    });
  },
};
