import type { BrandRecord, PublicBrandProfile } from "./brand.types.js";

export const toPublicBrandProfile = (
  brand: BrandRecord,
  productCount: number,
  isFollowing: boolean,
): PublicBrandProfile => ({
  id: brand.id,
  name: brand.name,
  avatarUrl: brand.avatarUrl,
  bannerUrl: brand.bannerUrl,
  madeInNepal: brand.madeInNepal,
  rating: brand.rating,
  productCount,
  followerCount: brand.followerCount,
  isFollowing,
});
