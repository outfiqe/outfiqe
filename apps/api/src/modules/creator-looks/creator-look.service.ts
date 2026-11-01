import { DomainEvents, eventBus } from "#events/event-bus.js";
import type { UserRole } from "#generated/prisma/enums.js";
import { TagReviewStatus } from "#generated/prisma/enums.js";
import { assertContentAllowed } from "#lib/content-check.utils.js";
import { requireApprovedCreator } from "#lib/creator-guard.utils.js";
import { extractHashtags } from "#lib/hashtags.utils.js";
import { imageProcessingService } from "#modules/image-processing/image-processing.service.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";
import type { ProductRecord } from "#modules/products/product.types.js";

import { creatorLookCommentService } from "./comments/comment.service.js";
import { creatorLookErrors } from "./creator-look.errors.js";
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

const MAX_TAGGED_PRODUCTS_SETTING = "outfit.maxItemsPerBoard";
const APPROVED_CREATOR_REQUIRED_MESSAGE = "Only approved muses can drop looks.";
const NO_CAPTION = "";
const CREATOR_LOOK_AUDIT_TARGET = "CreatorLook";

const requireOwnedLook = async (lookId: string, userId: string): Promise<CreatorLookEditDetail> => {
  const look = await creatorLookRepository.findOwnedById(lookId, userId);
  if (!look) throw creatorLookErrors.dropNotFound();
  return look;
};

const readMaxTaggedProducts = (): Promise<number> =>
  platformSettingsService.get(MAX_TAGGED_PRODUCTS_SETTING);

const assertWithinTagLimit = async (taggedProductCount: number): Promise<void> => {
  const maxTaggedProducts = await readMaxTaggedProducts();
  if (taggedProductCount > maxTaggedProducts) {
    throw creatorLookErrors.tooManyTaggedProducts(maxTaggedProducts);
  }
};

const requireApprovedProducts = async (
  productIds: string[],
): Promise<Map<string, ProductRecord>> => {
  const products = await productRepository.findApprovedByIds(productIds);
  if (products.length !== productIds.length) throw creatorLookErrors.productNotAvailable();
  return new Map(products.map((product) => [product.id, product]));
};

const validateLookBody = async (
  userId: string,
  { taggedProducts, imageUrls, imageAssetIds, caption }: CreateCreatorLookBody,
) => {
  await assertWithinTagLimit(taggedProducts.length);
  assertContentAllowed(caption);
  const productIds = taggedProducts.map((tag) => tag.productId);
  const productsById = await requireApprovedProducts(productIds);
  if (imageAssetIds?.length) {
    await imageProcessingService.assertAssetsOwnedBy(imageAssetIds, userId);
  }

  const [coverImageUrl, ...restImageUrls] = imageUrls;
  if (!coverImageUrl) throw creatorLookErrors.imageRequired();

  const nonEmptyImageUrls: [string, ...string[]] = [coverImageUrl, ...restImageUrls];
  return { productIds, productsById, nonEmptyImageUrls };
};

const toResolvedTagReview = (resolved: ResolvedTagReview | undefined): ResolvedTagReview => ({
  reviewStatus: resolved?.reviewStatus ?? TagReviewStatus.PENDING,
  approvalSource: resolved?.approvalSource ?? null,
});

const publishTagEvents = async ({
  lookId,
  creatorId,
  approvedProductIds,
  pendingProductIds,
  brandIdOfProduct,
}: {
  lookId: string;
  creatorId: string;
  approvedProductIds: string[];
  pendingProductIds: string[];
  brandIdOfProduct: (productId: string) => string | undefined;
}): Promise<void> => {
  for (const productId of approvedProductIds) {
    await eventBus.publish(DomainEvents.PRODUCT_TAGGED, { lookId, creatorId, productId });
  }
  for (const productId of pendingProductIds) {
    const brandId = brandIdOfProduct(productId);
    if (!brandId) continue;
    await eventBus.publish(DomainEvents.PRODUCT_TAG_SUBMITTED, {
      lookId,
      creatorId,
      productId,
      brandId,
    });
  }
};

export const creatorLookService = {
  async readLimits(): Promise<{ maxTaggedProducts: number }> {
    return { maxTaggedProducts: await readMaxTaggedProducts() };
  },

  async create(
    userId: string,
    body: CreateCreatorLookBody,
    outfitSource?: LookOutfitSource,
  ): Promise<CreatorLookSummary> {
    const { taggedProducts, imageAssetIds, caption, layout } = body;
    await requireApprovedCreator(userId, APPROVED_CREATOR_REQUIRED_MESSAGE);
    const { productIds, productsById, nonEmptyImageUrls } = await validateLookBody(userId, body);

    const resolvedTags = await resolveTagReviewForProducts(userId, productIds, productsById);

    const look = await creatorLookRepository.create({
      creatorId: userId,
      outfitSource,
      imageUrls: nonEmptyImageUrls,
      imageAssetIds,
      caption,
      layout,
      taggedProducts: taggedProducts.map((tag) => ({
        ...tag,
        ...toResolvedTagReview(resolvedTags.get(tag.productId)),
      })),
      hashtags: extractHashtags(caption ?? NO_CAPTION),
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
    await publishTagEvents({
      lookId: look.id,
      creatorId: userId,
      approvedProductIds,
      pendingProductIds,
      brandIdOfProduct: (productId) => resolvedTags.get(productId)?.brandId,
    });

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
    const { taggedProducts, imageAssetIds, caption } = body;
    const existing = await requireOwnedLook(lookId, userId);
    const {
      productIds: incomingProductIds,
      productsById,
      nonEmptyImageUrls,
    } = await validateLookBody(userId, body);

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
      addedProductIds.map((productId) => [
        productId,
        toResolvedTagReview(resolvedAddedTags.get(productId)),
      ]),
    );

    const { summary, newlyApprovedProductIds, submittedProductIds, removedProductIds } =
      await creatorLookRepository.update(lookId, {
        imageUrls: nonEmptyImageUrls,
        imageAssetIds,
        caption,
        taggedProducts,
        newTagStatuses,
        hashtags: extractHashtags(caption ?? NO_CAPTION),
      });

    const recountProductIds = [...new Set([...removedProductIds, ...newlyApprovedProductIds])];
    await Promise.all(
      recountProductIds.map((productId) => productService.recountWornBy(productId)),
    );

    await publishTagEvents({
      lookId,
      creatorId: userId,
      approvedProductIds: newlyApprovedProductIds,
      pendingProductIds: submittedProductIds,
      brandIdOfProduct: (productId) => productsById.get(productId)?.brandId,
    });

    return summary;
  },

  async remove(lookId: string, principal: { userId: string; role: UserRole }): Promise<void> {
    const existing = await creatorLookRepository.findActiveByIdForRemoval(lookId);
    if (!existing) throw creatorLookErrors.dropNotFound();

    const isOwner = existing.creatorId === principal.userId;
    const isModerator = !isOwner && (await isPlatformModerator(principal));
    if (!isOwner && !isModerator) throw creatorLookErrors.dropNotFound();

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
        targetType: CREATOR_LOOK_AUDIT_TARGET,
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
