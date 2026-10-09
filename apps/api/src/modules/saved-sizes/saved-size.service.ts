import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

import { savedSizeRepository } from "./saved-size.repository.js";
import type { SavedSizeView } from "./saved-size.types.js";

export const savedSizeService = {
  async listForUser(userId: string): Promise<SavedSizeView[]> {
    const [productTypes, lastBoughtSizes] = await Promise.all([
      savedSizeRepository.listActiveProductTypes(userId),
      savedSizeRepository.listLastBoughtSizes(userId),
    ]);
    const lastBoughtSizeByType = new Map(
      lastBoughtSizes.map(({ productTypeId, sizeLabel }) => [productTypeId, sizeLabel]),
    );

    return productTypes.map(({ id, slug, label, sizeOptions, savedSizes: [savedSize] }) => ({
      productTypeId: id,
      productTypeSlug: slug,
      productTypeLabel: label,
      sizeOptions: sizeOptions.map((option) => option.label),
      savedSize: savedSize?.sizeLabel ?? null,
      lastBoughtSize: lastBoughtSizeByType.get(id) ?? null,
    }));
  },

  async save(userId: string, productTypeId: string, sizeLabel: string): Promise<void> {
    if (!(await savedSizeRepository.hasSizeOption(productTypeId, sizeLabel))) {
      throw new AppError(
        "UNKNOWN_SIZE",
        "That size isn't offered for this kind of clothing.",
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      );
    }
    await savedSizeRepository.upsert(userId, productTypeId, sizeLabel);
  },

  async remove(userId: string, productTypeId: string): Promise<void> {
    await savedSizeRepository.remove(userId, productTypeId);
  },
};
