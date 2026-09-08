import { toResponsiveImage } from "#lib/responsive-image.utils.js";

import type { BrandWithImageAssets, PublicBrandProfile } from "./brand.types.js";

export const toPublicBrandProfile = (
  brand: BrandWithImageAssets,
  productCount: number,
  isFollowing: boolean,
  contactUserId: string | null = null,
): PublicBrandProfile => ({
  id: brand.id,
  name: brand.name,
  avatarUrl: brand.avatarUrl,
  avatarImage: brand.avatarUrl ? toResponsiveImage(brand.avatarUrl, brand.avatarImageAsset) : null,
  bannerUrl: brand.bannerUrl,
  bannerImage: brand.bannerUrl ? toResponsiveImage(brand.bannerUrl, brand.bannerImageAsset) : null,
  madeInNepal: brand.madeInNepal,
  rating: brand.rating,
  productCount,
  followerCount: brand.followerCount,
  isFollowing,
  contactUserId,
});
