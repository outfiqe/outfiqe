import { HTTP_STATUS } from "#constants/http.constants.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { UserRole } from "#generated/prisma/enums.js";
import { TagReviewStatus } from "#generated/prisma/enums.js";
import { assertContentAllowed } from "#lib/content-check.utils.js";
import { requireApprovedCreator } from "#lib/creator-guard.utils.js";
import { extractHashtags } from "#lib/hashtags.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { imageProcessingService } from "#modules/image-processing/image-processing.service.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";
import type { ProductRecord } from "#modules/products/product.types.js";

import { creatorLookCommentService } from "./comments/comment.service.js";
import { VALIDATION_STATUS } from "./creator-look.constants.js";
import { isPlatformModerator } from "./creator-look.guards.js";
import { creatorLookRepository } from "./creator-look.repository.js";
import type { AdminListLooksQuery, CreateCreatorLookBody } from "./creator-look.schemas.js";
import type {
  AdminLookPage,
  CreatorLookEditDetail,
  CreatorLookSummary,
  LookOutfitSource,
  ResolvedTagReview,
} from "./creator-look.types.js";
import { creatorLookEngagementService } from "./engagement/engagement.service.js";
import { creatorLookFeedService } from "./feed/feed.service.js";
import { resolveTagReviewForProducts } from "./tag-review/tag-review.service.js";
import { creatorLookTrendingService } from "./trending/trending.service.js";

const requireOwnedLook = async (lookId: string, userId: string): Promise<CreatorLookEditDetail> => {
  const look = await creatorLookRepository.findOwnedById(lookId, userId);
  if (!look)
    throw new AppError("LOOK_NOT_FOUND", "This drop no longer exists.", HTTP_STATUS.NOT_FOUND);
  return look;
};

const readMaxTaggedProducts = (): Promise<number> =>
  platformSettingsService.get("outfit.maxItemsPerBoard");

const assertWithinTagLimit = async (taggedProductCount: number): Promise<void> => {
  const maxTaggedProducts = await readMaxTaggedProducts();
  if (taggedProductCount > maxTaggedProducts) {
    throw new AppError(
      "TOO_MANY_TAGGED_PRODUCTS",
      `A look can tag up to ${maxTaggedProducts} products.`,
      VALIDATION_STATUS,
    );
  }
};

const requireApprovedProducts = async (
  productIds: string[],
): Promise<Map<string, ProductRecord>> => {
  const products = await productRepository.findApprovedByIds(productIds);
  if (products.length !== productIds.length) {
    throw new AppError(
      "PRODUCT_NOT_AVAILABLE",
      "One or more tagged products aren't available.",
      HTTP_STATUS.NOT_FOUND,
    );
  }
  return new Map(products.map((product) => [product.id, product]));
};

export const creatorLookService = {
  async readLimits(): Promise<{ maxTaggedProducts: number }> {
    return { maxTaggedProducts: await readMaxTaggedProducts() };
  },

  async create(
    userId: string,
    { taggedProducts, imageUrls, imageAssetIds, caption, layout }: CreateCreatorLookBody,
    outfitSource?: LookOutfitSource,
  ): Promise<CreatorLookSummary> {
    await requireApprovedCreator(userId, "Only approved muses can drop looks.");
    await assertWithinTagLimit(taggedProducts.length);
    assertContentAllowed(caption);
    const productIds = taggedProducts.map((tag) => tag.productId);
    const productsById = await requireApprovedProducts(productIds);
    if (imageAssetIds?.length) {
      await imageProcessingService.assertAssetsOwnedBy(imageAssetIds, userId);
    }

    const [coverImageUrl, ...restImageUrls] = imageUrls;
    if (!coverImageUrl) {
      throw new AppError("VALIDATION_ERROR", "At least one image is required.", VALIDATION_STATUS);
    }

    const resolvedTags = await resolveTagReviewForProducts(userId, productIds, productsById);

    const look = await creatorLookRepository.create({
      creatorId: userId,
      outfitSource,
      imageUrls: [coverImageUrl, ...restImageUrls],
      imageAssetIds,
      caption,
      layout,
      taggedProducts: taggedProducts.map((tag) => {
        const resolved = resolvedTags.get(tag.productId);
        return {
          ...tag,
          reviewStatus: resolved?.reviewStatus ?? TagReviewStatus.PENDING,
          approvalSource: resolved?.approvalSource ?? null,
        };
      }),
      hashtags: extractHashtags(caption ?? ""),
    });

    const approvedProductIds = productIds.filter(
      (productId) => resolvedTags.get(productId)?.reviewStatus === TagReviewStatus.APPROVED,
    );
    const pendingProductIds = productIds.filter(
      (productId) => !approvedProductIds.includes(productId),
    );

    await Promise.all(
      approvedProductIds.map((productId) => productService.recountWornBy(productId)),
    );

    await eventBus.publish(DomainEvents.LOOK_CREATED, {
      lookId: look.id,
      creatorId: userId,
      createdAt: look.createdAt.toISOString(),
    });
    for (const productId of approvedProductIds) {
      await eventBus.publish(DomainEvents.PRODUCT_TAGGED, {
        lookId: look.id,
        creatorId: userId,
        productId,
      });
    }
    for (const productId of pendingProductIds) {
      const brandId = resolvedTags.get(productId)?.brandId;
      if (!brandId) continue;
      await eventBus.publish(DomainEvents.PRODUCT_TAG_SUBMITTED, {
        lookId: look.id,
        creatorId: userId,
        productId,
        brandId,
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
    await assertWithinTagLimit(body.taggedProducts.length);
    assertContentAllowed(body.caption);
    const incomingProductIds = body.taggedProducts.map((tag) => tag.productId);
    const productsById = await requireApprovedProducts(incomingProductIds);
    if (body.imageAssetIds?.length) {
      await imageProcessingService.assertAssetsOwnedBy(body.imageAssetIds, userId);
    }

    const [coverImageUrl, ...restImageUrls] = body.imageUrls;
    if (!coverImageUrl) {
      throw new AppError("VALIDATION_ERROR", "At least one image is required.", VALIDATION_STATUS);
    }

    const previousProductIds = new Set(existing.taggedProducts.map((tag) => tag.productId));
    const addedProductIds = incomingProductIds.filter(
      (productId) => !previousProductIds.has(productId),
    );
    const resolvedAddedTags = await resolveTagReviewForProducts(
      userId,
      addedProductIds,
      productsById,
    );
    const newTagStatuses = new Map<string, ResolvedTagReview>(
      addedProductIds.map((productId) => {
        const resolved = resolvedAddedTags.get(productId);
        return [
          productId,
          {
            reviewStatus: resolved?.reviewStatus ?? TagReviewStatus.PENDING,
            approvalSource: resolved?.approvalSource ?? null,
          },
        ];
      }),
    );

    const { summary, newlyApprovedProductIds, submittedProductIds, removedProductIds } =
      await creatorLookRepository.update(lookId, {
        imageUrls: [coverImageUrl, ...restImageUrls],
        imageAssetIds: body.imageAssetIds,
        caption: body.caption,
        taggedProducts: body.taggedProducts,
        newTagStatuses,
        hashtags: extractHashtags(body.caption ?? ""),
      });

    const recountProductIds = [...new Set([...removedProductIds, ...newlyApprovedProductIds])];
    await Promise.all(
      recountProductIds.map((productId) => productService.recountWornBy(productId)),
    );

    for (const productId of newlyApprovedProductIds) {
      await eventBus.publish(DomainEvents.PRODUCT_TAGGED, { lookId, creatorId: userId, productId });
    }
    for (const productId of submittedProductIds) {
      const brandId = productsById.get(productId)?.brandId;
      if (!brandId) continue;
      await eventBus.publish(DomainEvents.PRODUCT_TAG_SUBMITTED, {
        lookId,
        creatorId: userId,
        productId,
        brandId,
      });
    }

    return summary;
  },

  async remove(lookId: string, principal: { userId: string; role: UserRole }): Promise<void> {
    const existing = await creatorLookRepository.findActiveByIdForRemoval(lookId);
    if (!existing) {
      throw new AppError("LOOK_NOT_FOUND", "This drop no longer exists.", HTTP_STATUS.NOT_FOUND);
    }

    const isOwner = existing.creatorId === principal.userId;
    const isModerator = !isOwner && (await isPlatformModerator(principal));
    if (!isOwner && !isModerator) {
      throw new AppError("LOOK_NOT_FOUND", "This drop no longer exists.", HTTP_STATUS.NOT_FOUND);
    }

    await creatorLookRepository.softDelete(lookId);

    await Promise.all(
      existing.taggedProducts.map((tag) => productService.recountWornBy(tag.productId)),
    );

    if (isModerator) {
      await platformAudit.record({
        actorUserId: principal.userId,
        action: PLATFORM_AUDIT_ACTION.CREATOR_LOOK_REMOVED_BY_ADMIN,
        summary: `Removed a drop by ${existing.creatorId}`,
        onBehalfOfUserId: existing.creatorId,
        targetType: "CreatorLook",
        targetId: lookId,
      });
    }
  },

  async adminListLooks(query: AdminListLooksQuery): Promise<AdminLookPage> {
    return creatorLookRepository.adminListLooks(query);
  },

  ...creatorLookFeedService,

  ...creatorLookTrendingService,

  ...creatorLookEngagementService,

  ...creatorLookCommentService,
};
