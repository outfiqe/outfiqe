import type { ResponsiveImage } from "@outfiqe/types";

import type { BrandRole } from "#generated/prisma/enums.js";
import type { ImageAssetForResponsiveImage } from "#lib/responsive-image.utils.js";

export type BrandRecord = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  instagram: string;
  avatarUrl: string | null;
  avatarImageAssetId: string | null;
  bannerUrl: string | null;
  bannerImageAssetId: string | null;
  madeInNepal: boolean;
  applicationId: string | null;
  followerCount: number;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BrandWithImageAssets = BrandRecord & {
  bannerImageAsset: ImageAssetForResponsiveImage | null;
  avatarImageAsset: ImageAssetForResponsiveImage | null;
};

export type BrandProfile = {
  brand: BrandRecord;
  membershipRole: BrandRole;
};

export type UpdateBrandInput = Partial<
  Pick<BrandRecord, "contactName" | "phone" | "instagram" | "avatarUrl" | "bannerUrl"> & {
    bannerImageAssetId: string | null;
    avatarImageAssetId: string | null;
  }
>;

export type BrandWithProductCount = BrandWithImageAssets & { productCount: number };

export type PublicBrandProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  avatarImage: ResponsiveImage | null;
  bannerUrl: string | null;
  bannerImage: ResponsiveImage | null;
  madeInNepal: boolean;
  rating: number | null;
  productCount: number;
  followerCount: number;
  isFollowing: boolean;
  contactUserId: string | null;
};

export type PublicBrandPage = {
  brands: PublicBrandProfile[];
  nextCursor: string | null;
  total: number;
};
