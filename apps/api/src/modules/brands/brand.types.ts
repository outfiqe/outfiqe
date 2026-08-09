import type { BrandCategory, BrandRole } from "../../generated/prisma/enums.js";

export type BrandRecord = {
  id: string;
  name: string;
  category: BrandCategory;
  contactName: string;
  email: string;
  phone: string;
  instagram: string;
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

export type PublicBrandProfile = {
  id: string;
  name: string;
  category: BrandCategory;
  madeInNepal: boolean;
  rating: number | null;
  productCount: number;
  followerCount: number;
  isFollowing: boolean;
};
