import type { PublicProductType } from "@outfiqe/types";

import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { productTypeRepository } from "./product-type.repository.js";
import type { CreateProductTypeBody, UpdateProductTypeBody } from "./product-type.schemas.js";
import type { ProductTypeRecord, ProductTypeWithCounts } from "./product-type.types.js";
import { toPublicProductType } from "./product-type.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;

const withSlugConflictHandling = async <T>(run: () => Promise<T>): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "SLUG_TAKEN",
        "A garment type with this slug already exists.",
        CONFLICT_STATUS,
      );
    }
    throw error;
  }
};

const requireProductType = async (id: string): Promise<ProductTypeRecord> => {
  const productType = await productTypeRepository.findById(id);
  if (!productType) {
    throw new AppError("NOT_FOUND", "Garment type not found.", NOT_FOUND_STATUS);
  }
  return productType;
};

export const productTypeService = {
  async create(input: CreateProductTypeBody): Promise<ProductTypeWithCounts> {
    return withSlugConflictHandling(() => productTypeRepository.create(input));
  },

  async update(id: string, input: UpdateProductTypeBody): Promise<ProductTypeWithCounts> {
    await requireProductType(id);
    return withSlugConflictHandling(() => productTypeRepository.update(id, input));
  },

  async reorder(orderedIds: string[]): Promise<void> {
    const existingIds = new Set(await productTypeRepository.listIds());
    const hasDuplicates = new Set(orderedIds).size !== orderedIds.length;
    const hasUnknownId = orderedIds.some((id) => !existingIds.has(id));

    if (hasDuplicates || hasUnknownId) {
      throw new AppError(
        "INVALID_ORDER",
        "The reorder request must list each garment type id once, and only known types.",
        UNPROCESSABLE_STATUS,
      );
    }

    await productTypeRepository.reorder(orderedIds);
  },

  async listForAdmin(): Promise<ProductTypeWithCounts[]> {
    return productTypeRepository.listAll();
  },

  async listForStorefront(): Promise<PublicProductType[]> {
    const productTypes = await productTypeRepository.listActive();
    return productTypes.map(toPublicProductType);
  },

  async listAssignable(): Promise<PublicProductType[]> {
    const productTypes = await productTypeRepository.listAssignable();
    return productTypes.map(toPublicProductType);
  },

  async getBySlug(slug: string): Promise<ProductTypeRecord> {
    const productType = await productTypeRepository.findBySlug(slug);
    if (!productType) {
      throw new AppError("PRODUCT_TYPE_NOT_FOUND", "Garment type not found.", NOT_FOUND_STATUS);
    }
    return productType;
  },

  async getActiveBySlug(slug: string): Promise<ProductTypeRecord> {
    const productType = await productTypeService.getBySlug(slug);
    if (!productType.isActive) {
      throw new AppError(
        "PRODUCT_TYPE_INACTIVE",
        "That garment type is currently switched off.",
        UNPROCESSABLE_STATUS,
      );
    }
    return productType;
  },
};
