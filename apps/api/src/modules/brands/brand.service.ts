import { brandRepository } from "./brand.repository.js";

import { AppError } from "../../shared/middlewares/error-handler.js";
import type { BrandProfile } from "./brand.types.js";

const NOT_FOUND_STATUS = 404;

export const brandService = {
  async getMyBrand(userId: string): Promise<BrandProfile> {
    const profile = await brandRepository.findByMemberUserId(userId);

    if (!profile) {
      throw new AppError(
        "BRAND_NOT_FOUND",
        "No brand is linked to this account.",
        NOT_FOUND_STATUS,
      );
    }

    return profile;
  },
};
