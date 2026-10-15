import type { BrandApplicationStatus, MakesOwnPieces } from "#generated/prisma/enums.js";

export type CreateBrandApplicationInput = {
  brandName: string;
  contactName: string;
  email: string;
  phone: string;
  instagram: string;
  makesOwnPieces: MakesOwnPieces;
  city?: string | null;
};

export type BrandApplicationRecord = CreateBrandApplicationInput & {
  id: string;
  status: BrandApplicationStatus;
  reviewedAt: Date | null;
  reviewedById: string | null;
  createdAt: Date;
};

export type BrandApplicationPage = {
  applications: BrandApplicationRecord[];
  nextCursor: string | null;
};

export type ApproveBrandApplicationInput = {
  reviewedById: string;
  tokenHash: string;
  expiresAt: Date;
};
