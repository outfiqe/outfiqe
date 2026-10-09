import { prisma } from "#db/prisma.js";
import { cartService } from "#modules/cart/cart.service.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";

import { BUILD_ITEM_LEFT_OUT_REASON } from "../outfit.constants.js";
import { outfitErrors } from "../outfit.errors.js";
import { outfitRepository } from "../outfit.repository.js";
import type { AddBuildToCartBody } from "../outfit.schemas.js";
import type { BuildCartResult, BuildItemLeftOutReason } from "../outfit.types.js";
import { parseSnapshotItems } from "../outfit.utils.js";
import { requireSocialAccess } from "../social/social.service.js";
import { type BuyableSize, outfitCartRepository } from "./cart.repository.js";

const NO_STOCK = 0;
const NO_ITEMS = 0;
const ONE_OF_EACH = 1;

const toSizeKey = (productId: string, label: string): string => `${productId}:${label}`;

const resolveBuyableVersion = async (viewerId: string, outfitId: string): Promise<number> => {
  const memberRole = await outfitRepository.findMemberRole(prisma, outfitId, viewerId);
  if (memberRole) {
    const isBuildOn = await featureFlagsService.isEnabledForUser("outfit_builder", viewerId);
    if (!isBuildOn) throw outfitErrors.notFound();
    const lockedVersion = await outfitRepository.findLatestSnapshotVersion(prisma, outfitId);
    if (lockedVersion === null) throw outfitErrors.neverLocked();
    return lockedVersion;
  }
  await requireSocialAccess(outfitId, viewerId);
  const outfit = await outfitRepository.findAccess(prisma, outfitId);
  if (!outfit || outfit.publishedVersion === null) throw outfitErrors.notFound();
  return outfit.publishedVersion;
};

const decideLeftOutReason = (
  productId: string,
  {
    buildProductIds,
    soldProductIds,
    chosenLabel,
    chosenSize,
  }: {
    buildProductIds: Set<string>;
    soldProductIds: Set<string>;
    chosenLabel: string | undefined;
    chosenSize: BuyableSize | undefined;
  },
): BuildItemLeftOutReason | null => {
  if (!buildProductIds.has(productId)) return BUILD_ITEM_LEFT_OUT_REASON.NOT_IN_BUILD;
  if (!soldProductIds.has(productId)) return BUILD_ITEM_LEFT_OUT_REASON.NO_LONGER_SOLD;
  if (!chosenLabel) return BUILD_ITEM_LEFT_OUT_REASON.NO_SIZE_CHOSEN;
  if (!chosenSize) return BUILD_ITEM_LEFT_OUT_REASON.SIZE_NOT_OFFERED;
  if (chosenSize.stock <= NO_STOCK) return BUILD_ITEM_LEFT_OUT_REASON.SOLD_OUT;
  return null;
};

export const outfitCartService = {
  async addToCart(
    viewerId: string,
    outfitId: string,
    { isFullSet, sizes }: AddBuildToCartBody,
  ): Promise<BuildCartResult> {
    const version = await resolveBuyableVersion(viewerId, outfitId);
    const snapshot = await outfitRepository.findSnapshot(prisma, outfitId, version);
    if (!snapshot) throw outfitErrors.notFound();

    const buildProductIdsInOrder = parseSnapshotItems(snapshot.items).map(
      ({ productId }) => productId,
    );
    const buildProductIds = new Set(buildProductIdsInOrder);
    const chosenLabelByProductId = new Map(
      sizes.map(({ productId, sizeLabel }) => [productId, sizeLabel]),
    );
    const wantedProductIds = isFullSet
      ? buildProductIdsInOrder
      : sizes.map(({ productId }) => productId);

    const buyableSizes = await outfitCartRepository.listBuyableSizes(
      wantedProductIds.filter((productId) => buildProductIds.has(productId)),
    );
    const soldProductIds = new Set(buyableSizes.map(({ productId }) => productId));
    const buyableSizeByKey = new Map(
      buyableSizes.map((size) => [toSizeKey(size.productId, size.label), size]),
    );

    const leftOut: BuildCartResult["leftOut"] = [];
    const sizesToAdd: BuyableSize[] = [];
    for (const productId of wantedProductIds) {
      const chosenLabel = chosenLabelByProductId.get(productId);
      const chosenSize = chosenLabel
        ? buyableSizeByKey.get(toSizeKey(productId, chosenLabel))
        : undefined;
      const reason = decideLeftOutReason(productId, {
        buildProductIds,
        soldProductIds,
        chosenLabel,
        chosenSize,
      });
      if (reason) leftOut.push({ productId, reason });
      else if (chosenSize) sizesToAdd.push(chosenSize);
    }

    const cart = await cartService.addItems(
      viewerId,
      sizesToAdd.map(({ productId, sizeId }) => ({ productId, sizeId, qty: ONE_OF_EACH })),
    );
    const addedProductIds = sizesToAdd.map(({ productId }) => productId);
    if (addedProductIds.length > NO_ITEMS) {
      await outfitCartRepository.recordVisits(viewerId, outfitId, version, addedProductIds);
    }
    return { cart, addedProductIds, leftOut };
  },
};
