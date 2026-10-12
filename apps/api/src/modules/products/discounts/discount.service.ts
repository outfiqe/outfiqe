import { HTTP_STATUS } from "#constants/http.constants.js";
import { BASIS_POINTS_PER_PERCENT } from "#constants/money.constants.js";
import { DiscountType } from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { MAX_BRAND_DISCOUNT_BASIS_POINTS } from "#modules/discounts/discount.constants.js";
import type { ActiveBrandDiscount } from "#modules/discounts/discount.types.js";
import { isBrandDiscountWithinCeiling } from "#modules/discounts/discount.utils.js";

import { requireOwnedProduct } from "../product.guards.js";
import type { SetProductDiscountBody, UpdateProductDiscountBody } from "../product.schemas.js";
import type { ProductDiscountView } from "../product.types.js";
import { toDiscountView } from "../product.utils.js";
import { productDiscountRepository } from "./discount.repository.js";

const DISCOUNT_CEILING_PERCENT = MAX_BRAND_DISCOUNT_BASIS_POINTS / BASIS_POINTS_PER_PERCENT;
const DISCOUNT_EXCEEDS_CEILING_MESSAGE = `A brand discount can't be worth more than ${DISCOUNT_CEILING_PERCENT}% of the product's price.`;

export const productDiscountService = {
  async setDiscount(
    userId: string,
    productId: string,
    input: SetProductDiscountBody,
  ): Promise<ProductDiscountView> {
    const brandId = await requireBrandId(userId);
    const product = await requireOwnedProduct(productId, brandId);

    const discount: ActiveBrandDiscount = {
      discountType: input.discountType,
      percentBasisPoints: input.percentBasisPoints ?? null,
      fixedAmount: input.fixedAmount ?? null,
    };
    if (!isBrandDiscountWithinCeiling(product.price, discount)) {
      throw new AppError(
        "DISCOUNT_EXCEEDS_CEILING",
        DISCOUNT_EXCEEDS_CEILING_MESSAGE,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const created = await productDiscountRepository.createDiscount(productId, {
      discountType: input.discountType,
      percentBasisPoints: discount.percentBasisPoints,
      fixedAmount: discount.fixedAmount,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      createdById: userId,
    });

    return toDiscountView(created);
  },

  async updateDiscount(
    userId: string,
    productId: string,
    input: UpdateProductDiscountBody,
  ): Promise<ProductDiscountView> {
    const brandId = await requireBrandId(userId);
    const product = await requireOwnedProduct(productId, brandId);

    const existing = await productDiscountRepository.findActiveDiscount(productId);
    if (!existing) {
      throw new AppError(
        "DISCOUNT_NOT_FOUND",
        "This product has no active discount to edit.",
        HTTP_STATUS.NOT_FOUND,
      );
    }

    const discountTypeChanged =
      input.discountType !== undefined && input.discountType !== existing.discountType;
    const nextDiscountType = input.discountType ?? existing.discountType;

    const nextPercentBasisPoints = discountTypeChanged
      ? nextDiscountType === DiscountType.PERCENT
        ? (input.percentBasisPoints ?? null)
        : null
      : (input.percentBasisPoints ?? existing.percentBasisPoints);

    const nextFixedAmount = discountTypeChanged
      ? nextDiscountType === DiscountType.FIXED
        ? (input.fixedAmount ?? null)
        : null
      : (input.fixedAmount ?? existing.fixedAmount);

    if (nextDiscountType === DiscountType.PERCENT && nextPercentBasisPoints === null) {
      throw new AppError(
        "DISCOUNT_AMOUNT_REQUIRED",
        "Switching to a percent discount needs percentBasisPoints.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    if (nextDiscountType === DiscountType.FIXED && nextFixedAmount === null) {
      throw new AppError(
        "DISCOUNT_AMOUNT_REQUIRED",
        "Switching to a fixed discount needs fixedAmount.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const nextStartsAt = input.startsAt ?? existing.startsAt;
    const nextEndsAt = input.endsAt !== undefined ? input.endsAt : existing.endsAt;
    if (nextEndsAt && nextEndsAt <= nextStartsAt) {
      throw new AppError(
        "INVALID_DISCOUNT_WINDOW",
        "endsAt must be after startsAt.",
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const nextDiscount: ActiveBrandDiscount = {
      discountType: nextDiscountType,
      percentBasisPoints: nextPercentBasisPoints,
      fixedAmount: nextFixedAmount,
    };
    if (!isBrandDiscountWithinCeiling(product.price, nextDiscount)) {
      throw new AppError(
        "DISCOUNT_EXCEEDS_CEILING",
        DISCOUNT_EXCEEDS_CEILING_MESSAGE,
        HTTP_STATUS.BAD_REQUEST,
      );
    }

    const updated = await productDiscountRepository.updateDiscount(existing.id, {
      discountType: nextDiscountType,
      percentBasisPoints: nextPercentBasisPoints,
      fixedAmount: nextFixedAmount,
      startsAt: nextStartsAt,
      endsAt: nextEndsAt,
    });

    return toDiscountView(updated);
  },

  async removeDiscount(userId: string, productId: string): Promise<void> {
    const brandId = await requireBrandId(userId);
    await requireOwnedProduct(productId, brandId);

    const existing = await productDiscountRepository.findActiveDiscount(productId);
    if (!existing) {
      throw new AppError(
        "DISCOUNT_NOT_FOUND",
        "This product has no active discount to remove.",
        HTTP_STATUS.NOT_FOUND,
      );
    }
    await productDiscountRepository.deactivateDiscount(existing.id);
  },
};
