import { HTTP_STATUS } from "#constants/http.constants.js";
import type { Prisma } from "#generated/prisma/client.js";
import { InventoryMovementKind, InventoryMovementSource } from "#generated/prisma/enums.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { couponRepository } from "#modules/coupons/coupon.repository.js";
import { productService } from "#modules/products/product.service.js";

import { orderFulfilmentGroupRepository } from "../fulfilment-groups/fulfilment-group.repository.js";
import { ITEMS_UNAVAILABLE_STATUS } from "./checkout.constants.js";
import type {
  CheckoutCouponResolution,
  CheckoutLine,
  PricedCheckoutLine,
} from "./checkout.types.js";

export const commitCashOnDeliveryStock = async (
  tx: Prisma.TransactionClient,
  lines: CheckoutLine[],
  orderId: string,
): Promise<void> => {
  const insufficientSizeIds = await productService.decrementStockForItems(
    tx,
    lines.map(({ sizeId, qty }) => ({ sizeId, qty })),
    {
      kind: InventoryMovementKind.ORDER_COMMIT,
      sourceType: InventoryMovementSource.ORDER,
      sourceId: orderId,
    },
  );
  if (insufficientSizeIds.length > 0) {
    throw new AppError(
      "ITEMS_UNAVAILABLE",
      "Some items sold out just now.",
      ITEMS_UNAVAILABLE_STATUS,
      {
        sizeIds: insufficientSizeIds,
      },
    );
  }
};

type RedeemCheckoutCouponInput = {
  couponResolution: CheckoutCouponResolution;
  userId: string;
  orderId: string;
  platformDiscountTotal: number;
};

export const redeemCheckoutCoupon = async (
  tx: Prisma.TransactionClient,
  { couponResolution, userId, orderId, platformDiscountTotal }: RedeemCheckoutCouponInput,
): Promise<void> => {
  const claimed = await couponRepository.claimBudget(
    tx,
    couponResolution.coupon.id,
    platformDiscountTotal,
  );
  if (!claimed) {
    throw new AppError(
      "COUPON_EXHAUSTED",
      "This coupon has reached its limit.",
      HTTP_STATUS.CONFLICT,
    );
  }
  try {
    await couponRepository.createRedemption(tx, {
      couponId: couponResolution.coupon.id,
      userId,
      orderId,
      discountAmount: platformDiscountTotal,
      platformFundedAmount: platformDiscountTotal,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError(
        "COUPON_ALREADY_USED",
        "You've already used this coupon.",
        HTTP_STATUS.CONFLICT,
      );
    }
    throw error;
  }
};

type AssignBrandFulfilmentGroupsInput = {
  orderId: string;
  orderItems: { id: string }[];
  pricedLines: PricedCheckoutLine[];
  distinctBrandIds: string[];
};

export const assignBrandFulfilmentGroups = async (
  tx: Prisma.TransactionClient,
  { orderId, orderItems, pricedLines, distinctBrandIds }: AssignBrandFulfilmentGroupsInput,
): Promise<void> => {
  const fulfilmentGroups = await orderFulfilmentGroupRepository.createFulfilmentGroups(
    tx,
    orderId,
    distinctBrandIds,
  );
  const fulfilmentGroupIdByBrandId = new Map(
    fulfilmentGroups.map((group) => [group.brandId, group.id]),
  );
  for (const brandId of distinctBrandIds) {
    const fulfilmentGroupId = fulfilmentGroupIdByBrandId.get(brandId);
    if (!fulfilmentGroupId) continue;
    const itemIdsForBrand = orderItems
      .filter((_, index) => pricedLines[index]?.brandId === brandId)
      .map((orderItem) => orderItem.id);
    await orderFulfilmentGroupRepository.assignItemsToFulfilmentGroup(
      tx,
      fulfilmentGroupId,
      itemIdsForBrand,
    );
  }
};
