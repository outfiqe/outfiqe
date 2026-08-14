import { FollowTargetType } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { followRepository } from "#modules/follows/follow.repository.js";

import { brandRepository } from "./brand.repository.js";
import type { UpdateBrandProfileBody } from "./brand.schemas.js";
import type { BrandProfile, PublicBrandProfile } from "./brand.types.js";

const NOT_FOUND_STATUS = 404;

export const brandService = {
  async getMyBrand(userId: string): Promise<BrandProfile> {
    const profile = await brandRepository.findByMemberUserId(userId);

    if (!profile) {
      throw new AppError(
        "BRAND_NOT_FOUND",
        "No brand is linked to this account.",
        NOT_FOUND_STATUS,
      );
    }

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

    const brand = await brandRepository.update(profile.brand.id, input);
    return { brand, membershipRole: profile.membershipRole };
  },

  async getPublicProfile(id: string, viewerId?: string): Promise<PublicBrandProfile> {
    const brand = await brandRepository.findById(id);
    if (!brand) throw new AppError("NOT_FOUND", "Brand not found.", NOT_FOUND_STATUS);

    const [productCount, isFollowing] = await Promise.all([
      brandRepository.countApprovedProducts(id),
      viewerId ? followRepository.isFollowing(viewerId, FollowTargetType.BRAND, id) : false,
    ]);

    return {
      id: brand.id,
      name: brand.name,
      avatarUrl: brand.avatarUrl,
      bannerUrl: brand.bannerUrl,
      madeInNepal: brand.madeInNepal,
      rating: brand.rating,
      productCount,
      followerCount: brand.followerCount,
      isFollowing,
    };
  },
};
