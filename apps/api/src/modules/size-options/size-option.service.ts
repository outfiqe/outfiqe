import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { productTypeService } from "#modules/product-types/product-type.service.js";

import { sizeOptionRepository } from "./size-option.repository.js";
import type { CreateSizeOptionBody } from "./size-option.schemas.js";
import type { SizeOptionRecord } from "./size-option.types.js";

const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;

export type PublicSizeOption = {
  id: string;
  type: string;
  label: string;
  sortOrder: number;
};

const toPublicSizeOption = (sizeOption: SizeOptionRecord): PublicSizeOption => ({
  id: sizeOption.id,
  type: sizeOption.productType.slug,
  label: sizeOption.label,
  sortOrder: sizeOption.sortOrder,
});

export const sizeOptionService = {
  async create({ type, label, sortOrder }: CreateSizeOptionBody): Promise<PublicSizeOption> {
    const productType = await productTypeService.getBySlug(type);
    try {
      const sizeOption = await sizeOptionRepository.create({
        productTypeId: productType.id,
        label,
        sortOrder,
      });
      return toPublicSizeOption(sizeOption);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new AppError(
          "SIZE_LABEL_TAKEN",
          "This size already exists for that garment type.",
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

  async listByType(type: string): Promise<PublicSizeOption[]> {
    const productType = await productTypeService.getBySlug(type);
    const sizeOptions = await sizeOptionRepository.listByProductTypeId(productType.id);
    return sizeOptions.map(toPublicSizeOption);
  },

  async getManyByIds(ids: string[], productTypeId: string): Promise<SizeOptionRecord[]> {
    const sizeOptions = await sizeOptionRepository.findManyByIds(ids);
    const valid = sizeOptions.filter((sizeOption) => sizeOption.productTypeId === productTypeId);

    if (valid.length !== new Set(ids).size) {
      throw new AppError(
        "SIZE_OPTION_NOT_FOUND",
        "One or more selected sizes weren't found for this garment type.",
        NOT_FOUND_STATUS,
      );
    }

    return valid;
  },
};
