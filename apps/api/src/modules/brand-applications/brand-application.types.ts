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

export type BrandApplicationSummary = BrandApplicationRecord & {
  isAwaitingBrandSetup: boolean;
};

export type BrandApplicationPage = {
  applications: BrandApplicationSummary[];
  nextCursor: string | null;
};

export type BrandInviteDeliveryResult = {
  isInviteDelivered: boolean;
};

export type RotateBrandInviteInput = {
  tokenHash: string;
  expiresAt: Date;
};

export type ApproveBrandApplicationInput = {
  reviewedById: string;
  tokenHash: string;
  expiresAt: Date;
};
