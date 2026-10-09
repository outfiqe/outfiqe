import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isForeignKeyConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { categoryService } from "#modules/categories/category.service.js";
import { imageProcessingService } from "#modules/image-processing/image-processing.service.js";
import { productTypeService } from "#modules/product-types/product-type.service.js";
import { sizeOptionService } from "#modules/size-options/size-option.service.js";

import { productCatalogService } from "./catalog/catalog.service.js";
import { productDiscountService } from "./discounts/discount.service.js";
import { productInventoryService, recordNewSizeStock } from "./inventory/inventory.service.js";
import { requireOwnedProduct } from "./product.guards.js";
import { productRepository } from "./product.repository.js";
import type {
  CreateProductBody,
  ListMineProductsQuery,
  UpdateProductBody,
} from "./product.schemas.js";
import type {
  CreateProductSizeInput,
  ProductBrandSummary,
  ProductBrandSummaryPage,
} from "./product.types.js";
import { toBrandSummary } from "./product.utils.js";
import { productReviewService } from "./review/review.service.js";
import { productSocialProofService } from "./social-proof/social-proof.service.js";

export const productService = {
  async create(
    userId: string,
    {
      categories: categorySlugs,
      name,
      price,
      type,
      imageUrls,
      imageAssetIds,
      lowStock,
      sizes,
      isThrift,
      thriftConditionRating,
      thriftConditionNotes,
    }: CreateProductBody,
  ): Promise<ProductBrandSummary> {
    const brandId = await requireBrandId(userId);
    if (imageAssetIds?.length) {
      await imageProcessingService.assertAssetsOwnedBy(imageAssetIds, userId);
    }
    const productType = await productTypeService.getActiveBySlug(type);
    const categories = await categoryService.getManyBySlugs(categorySlugs);
    const sizeOptions = await sizeOptionService.getManyByIds(
      sizes.map((size) => size.sizeOptionId),
      productType.id,
    );
    const sizeOptionById = new Map(sizeOptions.map((sizeOption) => [sizeOption.id, sizeOption]));

    const productInput = {
      brandId,
      name,
      price,
      productTypeId: productType.id,
      categoryIds: categories.map((category) => category.id),
      imageUrls,
      imageAssetIds,
      lowStock,
      isThrift,
      thriftConditionRating: isThrift ? thriftConditionRating : undefined,
      thriftConditionNotes: isThrift ? thriftConditionNotes : undefined,
      sizes: sizes.map(({ sizeOptionId, stock }, sortOrder) => {
        const sizeOption = sizeOptionById.get(sizeOptionId);
        if (!sizeOption) {
          throw new AppError(
            "SIZE_OPTION_NOT_FOUND",
            "One or more selected sizes weren't found.",
            HTTP_STATUS.NOT_FOUND,
          );
        }
        return { label: sizeOption.label, stock, sortOrder };
      }),
    };

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await productRepository.create(tx, productInput);
      await recordNewSizeStock(tx, createdProduct.id, createdProduct.sizes);
      return createdProduct;
    });

    return toBrandSummary(product);
  },

  async update(
    userId: string,
    productId: string,
    {
      categories,
      name,
      price,
      type,
      imageUrls,
      imageAssetIds,
      lowStock,
      sizes,
      isThrift,
      thriftConditionRating,
      thriftConditionNotes,
    }: UpdateProductBody,
  ): Promise<ProductBrandSummary> {
    const brandId = await requireBrandId(userId);
    const product = await requireOwnedProduct(productId, brandId);
    if (imageAssetIds?.length) {
      await imageProcessingService.assertAssetsOwnedBy(imageAssetIds, userId);
    }

    const categoryIds = categories
      ? (await categoryService.getManyBySlugs(categories)).map((category) => category.id)
      : undefined;

    const targetProductType = type ? await productTypeService.getActiveBySlug(type) : undefined;
    const isTypeChange =
      targetProductType !== undefined && targetProductType.id !== product.productTypeId;

    let sizeChanges: CreateProductSizeInput[] | undefined;
    if (isTypeChange) {
      if (!sizes || sizes.length === 0) {
        throw new AppError(
          "SIZES_REQUIRED",
          "Add at least one size for the new product type.",
          HTTP_STATUS.BAD_REQUEST,
        );
      }

      const sizeOptions = await sizeOptionService.getManyByIds(
        sizes.map((size) => size.sizeOptionId),
        targetProductType.id,
      );
      const sizeOptionById = new Map(sizeOptions.map((sizeOption) => [sizeOption.id, sizeOption]));

      sizeChanges = sizes.map(({ sizeOptionId, stock }, sortOrder) => {
        const sizeOption = sizeOptionById.get(sizeOptionId);
        if (!sizeOption) {
          throw new AppError(
            "SIZE_OPTION_NOT_FOUND",
            "One or more selected sizes weren't found.",
            HTTP_STATUS.NOT_FOUND,
          );
        }
        return { label: sizeOption.label, stock, sortOrder };
      });
    }

    try {
      const updatedProduct = await prisma.$transaction(async (tx) => {
        const savedProduct = await productRepository.update(tx, productId, {
          name,
          price,
          productTypeId: targetProductType?.id,
          categoryIds,
          imageUrls,
          imageAssetIds,
          lowStock,
          sizes: sizeChanges,
          isThrift,
          thriftConditionRating: isThrift === false ? null : (thriftConditionRating ?? undefined),
          thriftConditionNotes: isThrift === false ? null : (thriftConditionNotes ?? undefined),
        });
        if (sizeChanges) await recordNewSizeStock(tx, savedProduct.id, savedProduct.sizes);
        return savedProduct;
      });
      return toBrandSummary(updatedProduct);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw new AppError(
          "SIZES_IN_USE",
          "Can't change product type — some of its current sizes already have orders and can't be removed.",
          HTTP_STATUS.CONFLICT,
        );
      }
      throw error;
    }
  },

  async delete(userId: string, productId: string): Promise<void> {
    const brandId = await requireBrandId(userId);
    await requireOwnedProduct(productId, brandId);
    await productRepository.softDelete(productId);
  },

  async listMine(
    userId: string,
    { cursor, limit }: ListMineProductsQuery,
  ): Promise<ProductBrandSummaryPage> {
    const brandId = await requireBrandId(userId);
    const rows = await productRepository.listByBrandId(brandId, { cursor, limit });

    const { items: pagedProducts, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);
    return { products: pagedProducts.map(toBrandSummary), nextCursor };
  },

  ...productCatalogService,

  ...productDiscountService,

  ...productInventoryService,

  ...productReviewService,

  ...productSocialProofService,
};
