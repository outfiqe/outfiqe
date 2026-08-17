import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import type { ProductTypeSlug } from "#modules/products/product.constants.js";
import { PRODUCT_TYPE_TO_SLUG, SLUG_TO_PRODUCT_TYPE } from "#modules/products/product.constants.js";

import { sizeOptionRepository } from "./size-option.repository.js";
import type { CreateSizeOptionBody } from "./size-option.schemas.js";
import type { SizeOptionRecord } from "./size-option.types.js";

const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;

export type PublicSizeOption = {
  id: string;
  type: ProductTypeSlug;
  label: string;
  sortOrder: number;
};

const toPublicSizeOption = (sizeOption: SizeOptionRecord): PublicSizeOption => ({
  id: sizeOption.id,
  type: PRODUCT_TYPE_TO_SLUG[sizeOption.type],
  label: sizeOption.label,
  sortOrder: sizeOption.sortOrder,
});

export const sizeOptionService = {
  async create({ type, label, sortOrder }: CreateSizeOptionBody): Promise<PublicSizeOption> {
    try {
      const sizeOption = await sizeOptionRepository.create({
        type: SLUG_TO_PRODUCT_TYPE[type],
        label,
        sortOrder,
      });
      return toPublicSizeOption(sizeOption);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          "SIZE_LABEL_TAKEN",
          "This size already exists for that product type.",
          CONFLICT_STATUS,
        );
      }
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    const deleted = await sizeOptionRepository.delete(id);
    if (!deleted) throw new AppError("NOT_FOUND", "Size not found.", NOT_FOUND_STATUS);
  },

  async listAll(): Promise<PublicSizeOption[]> {
    const sizeOptions = await sizeOptionRepository.listAll();
    return sizeOptions.map(toPublicSizeOption);
  },

  async listByType(type: ProductTypeSlug): Promise<PublicSizeOption[]> {
    const sizeOptions = await sizeOptionRepository.listByType(SLUG_TO_PRODUCT_TYPE[type]);
    return sizeOptions.map(toPublicSizeOption);
  },

  async getManyByIds(ids: string[], type: ProductTypeSlug): Promise<SizeOptionRecord[]> {
    const sizeOptions = await sizeOptionRepository.findManyByIds(ids);
    const expectedType = SLUG_TO_PRODUCT_TYPE[type];
    const valid = sizeOptions.filter((sizeOption) => sizeOption.type === expectedType);

    if (valid.length !== new Set(ids).size) {
      throw new AppError(
        "SIZE_OPTION_NOT_FOUND",
        "One or more selected sizes weren't found for this product type.",
        NOT_FOUND_STATUS,
      );
    }

    return valid;
  },
};
