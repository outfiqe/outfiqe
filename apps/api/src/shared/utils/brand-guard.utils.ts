import { HTTP_STATUS } from "#constants/http.constants.js";
import { AccountStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { brandRepository } from "#modules/brands/brand.repository.js";

export const requireBrandId = async (userId: string): Promise<string> => {
  const profile = await brandRepository.findByMemberUserId(userId);
  if (!profile) {
    throw new AppError(
      "BRAND_NOT_FOUND",
      "No brand is linked to this account.",
      HTTP_STATUS.NOT_FOUND,
    );
  }
  if (profile.brand.accountStatus !== AccountStatus.ACTIVE) {
    throw new AppError(
      "BRAND_SUSPENDED",
      "This brand's account is suspended and can't be acted on right now.",
      HTTP_STATUS.FORBIDDEN,
    );
  }
  return profile.brand.id;
};
