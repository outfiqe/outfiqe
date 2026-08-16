import { AppError } from "#middlewares/error-handler.js";
import { brandRepository } from "#modules/brands/brand.repository.js";

const NOT_FOUND_STATUS = 404;

export const requireBrandId = async (userId: string): Promise<string> => {
  const profile = await brandRepository.findByMemberUserId(userId);
  if (!profile) {
    throw new AppError("BRAND_NOT_FOUND", "No brand is linked to this account.", NOT_FOUND_STATUS);
  }
  return profile.brand.id;
};
