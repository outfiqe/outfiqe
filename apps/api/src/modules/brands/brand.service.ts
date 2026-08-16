import { FollowTargetType } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { followRepository } from "#modules/follows/follow.repository.js";

import { brandRepository } from "./brand.repository.js";
import type { ListBrandsQuery, UpdateBrandProfileBody } from "./brand.schemas.js";
import type { BrandProfile, PublicBrandPage, PublicBrandProfile } from "./brand.types.js";
import { toPublicBrandProfile } from "./brand.utils.js";

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

    return toPublicBrandProfile(brand, productCount, isFollowing);
  },

  async listPublic(query: ListBrandsQuery, viewerId?: string): Promise<PublicBrandPage> {
    const [rows, total] = await Promise.all([
      brandRepository.listPublic({ cursor: query.cursor, limit: query.limit }),
      brandRepository.countAll(),
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
