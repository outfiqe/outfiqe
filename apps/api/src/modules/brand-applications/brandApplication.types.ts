import type { BrandCategory, MakesOwnPieces } from "../../generated/prisma/enums.js";

export type CreateBrandApplicationInput = {
  brandName: string;
  contactName: string;
  email: string;
  phone: string;
  instagram: string;
  category: BrandCategory;
  makesOwnPieces: MakesOwnPieces;
};

export type BrandApplicationRecord = CreateBrandApplicationInput & {
  id: string;
  createdAt: Date;
};
