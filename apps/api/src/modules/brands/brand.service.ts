import { AccountStatus, FollowTargetType } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { followRepository } from "#modules/follows/follow.repository.js";
import { imageProcessingService } from "#modules/image-processing/image-processing.service.js";

import { brandRepository } from "./brand.repository.js";
import type { ListBrandsQuery, UpdateBrandProfileBody } from "./brand.schemas.js";
import type { BrandProfile, PublicBrandPage, PublicBrandProfile } from "./brand.types.js";
import { toPublicBrandProfile } from "./brand.utils.js";

const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;

export const brandService = {
  async assertActive(brandId: string): Promise<void> {
    const accountStatus = await brandRepository.findAccountStatus(brandId);
    if (!accountStatus) {
      throw new AppError("BRAND_NOT_FOUND", "Brand not found.", NOT_FOUND_STATUS);
    }
    if (accountStatus !== AccountStatus.ACTIVE) {
      throw new AppError(
        "BRAND_SUSPENDED",
        "This brand's account is suspended and can't be acted on right now.",
        FORBIDDEN_STATUS,
      );
    }
  },

  async getMyBrand(userId: string): Promise<BrandProfile> {
    const profile = await brandRepository.findByMemberUserId(userId);

    if (!profile) {
      throw new AppError(
        "BRAND_NOT_FOUND",
        "No brand is linked to this account.",
        NOT_FOUND_STATUS,
      );
    }

    await brandService.assertActive(profile.brand.id);

    return profile;
  },

  async updateMyBrand(userId: string, input: UpdateBrandProfileBody): Promise<BrandProfile> {
    const profile = await brandRepository.findByMemberUserId(userId);

    if (!profile) {
      throw new AppError(
        "BRAND_NOT_FOUND",
        "No brand is linked to this account.",
        NOT_FOUND_STATUS,
      );
    }

    await brandService.assertActive(profile.brand.id);

    const linkedAssetIds = [input.bannerImageAssetId, input.avatarImageAssetId].filter(
      (assetId): assetId is string => Boolean(assetId),
    );
    if (linkedAssetIds.length > 0) {
      await imageProcessingService.assertAssetsOwnedBy(linkedAssetIds, userId);
    }

    const brand = await brandRepository.update(profile.brand.id, input);
    return { brand, membershipRole: profile.membershipRole };
  },

  async getPublicProfile(id: string, viewerId?: string): Promise<PublicBrandProfile> {
    const brand = await brandRepository.findById(id);
    if (!brand) throw new AppError("NOT_FOUND", "Brand not found.", NOT_FOUND_STATUS);

    const [productCount, isFollowing, contactUserId] = await Promise.all([
      brandRepository.countApprovedProducts(id),
      viewerId ? followRepository.isFollowing(viewerId, FollowTargetType.BRAND, id) : false,
      brandRepository.findOwnerUserId(id),
    ]);

    return toPublicBrandProfile(brand, productCount, isFollowing, contactUserId);
  },

  async listPublic(query: ListBrandsQuery, viewerId?: string): Promise<PublicBrandPage> {
    const [rows, total] = await Promise.all([
      brandRepository.listPublic({ cursor: query.cursor, limit: query.limit, q: query.q }),
      brandRepository.countAll(query.q),
    ]);

    const { items: brandRows, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    const followingIds = viewerId
      ? await followRepository.listFollowingIdsAmong(
          viewerId,
          FollowTargetType.BRAND,
          brandRows.map((row) => row.id),
        )
      : [];
    const followingIdSet = new Set(followingIds);

    return {
      brands: brandRows.map((brand) =>
        toPublicBrandProfile(brand, brand.productCount, followingIdSet.has(brand.id)),
      ),
      nextCursor,
      total,
    };
  },
};
