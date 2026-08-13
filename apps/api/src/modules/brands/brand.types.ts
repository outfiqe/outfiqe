import type { BrandRole } from "../../generated/prisma/enums.js";

export type BrandRecord = {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  instagram: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  madeInNepal: boolean;
  applicationId: string | null;
  followerCount: number;
  rating: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BrandProfile = {
  brand: BrandRecord;
  membershipRole: BrandRole;
};

export type UpdateBrandInput = Partial<
  Pick<BrandRecord, "contactName" | "phone" | "instagram" | "avatarUrl" | "bannerUrl">
>;

export type PublicBrandProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  madeInNepal: boolean;
  rating: number | null;
  productCount: number;
  followerCount: number;
  isFollowing: boolean;
};
