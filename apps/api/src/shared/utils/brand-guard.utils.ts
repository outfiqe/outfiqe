import { AccountStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandRepository } from "#modules/brands/brand.repository.js";

const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;

export const requireBrandId = async (userId: string): Promise<string> => {
  const profile = await brandRepository.findByMemberUserId(userId);
  if (!profile) {
    throw new AppError("BRAND_NOT_FOUND", "No brand is linked to this account.", NOT_FOUND_STATUS);
  }
  if (profile.brand.accountStatus !== AccountStatus.ACTIVE) {
    throw new AppError(
      "BRAND_SUSPENDED",
      "This brand's account is suspended and can't be acted on right now.",
      FORBIDDEN_STATUS,
    );
  }
  return profile.brand.id;
};
