import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  BrandRole,
  CommissionSource,
  CommissionStatus,
  CouponType,
  FulfilmentMode,
  PaymentMethod,
  PaymentStatus,
  PaymentTransactionStatus,
  PaymentTransactionType,
  PickupStatus,
  UserRole,
} from "#generated/prisma/enums.js";

import {
  authHeaderFor,
  createActiveCommissionRule,
  createBuyer,
  createPurchasableProduct,
  createUserWithRole,
} from "./order-fixtures.js";

const PLATFORM_FEE_BASIS_POINTS = 1000;
const BASIS_POINTS_DIVISOR = 10_000;
const DEFAULT_DELIVERY_FEE = 100;
const COMMISSION_AMOUNT = 75;
const NO_DISCOUNT = 0;
const ONE_REDEMPTION = 1;

export type RefundFixtureLine = {
  unitPrice: number;
  qty: number;
  platformDiscountAmount?: number;
  withCommission?: boolean;
  fulfilmentMode?: FulfilmentMode;
};

type RefundableOrderOptions = {
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  lines: RefundFixtureLine[];
  deliveryFee?: number;
  coupon?: { discountAmount: number; platformFundedAmount: number };
};

const platformFeeFor = (grossAmount: number) =>
  Math.floor((grossAmount * PLATFORM_FEE_BASIS_POINTS) / BASIS_POINTS_DIVISOR);

const createCoupon = async (
  discountAmount: number,
  platformFundedAmount: number,
  createdById: string,
) =>
  prisma.coupon.create({
    data: {
      code: `REFUND${randomUUID().slice(0, 6).toUpperCase()}`,
      type: CouponType.FIXED,
      fixedAmount: discountAmount,
      startsAt: new Date(),
      spentAmount: platformFundedAmount,
      redemptionCount: ONE_REDEMPTION,
      createdById,
    },
  });

export const createOwnerSessionForBrand = async (brandId: string) => {
  const owner = await createUserWithRole(UserRole.BRAND_OWNER);
  await prisma.brandMembership.create({
    data: { userId: owner.id, brandId, role: BrandRole.OWNER },
  });
  return { userId: owner.id, authHeader: authHeaderFor(owner.id, UserRole.BRAND_OWNER) };
};

export const createRefundableOrder = async ({
  paymentMethod,
  paymentStatus,
  lines,
  deliveryFee = DEFAULT_DELIVERY_FEE,
  coupon,
}: RefundableOrderOptions) => {
  const buyer = await createBuyer();
  const admin = await createUserWithRole(UserRole.ADMIN);
  const rule = await createActiveCommissionRule(admin.id, PLATFORM_FEE_BASIS_POINTS);
  const [tier] = rule.tiers;
  if (!tier) throw new Error("The commission rule fixture has no tier.");

  const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.qty, NO_DISCOUNT);
  const platformDiscountTotal = lines.reduce(
    (sum, line) => sum + (line.platformDiscountAmount ?? NO_DISCOUNT),
    NO_DISCOUNT,
  );
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Refund Buyer",
      phone: "9800000000",
      address: "Baneshwor",
      city: "Kathmandu",
      paymentMethod,
      paymentStatus,
      subtotal,
      deliveryFee,
      platformDiscountTotal,
      total: subtotal - platformDiscountTotal + deliveryFee,
    },
  });

  const items = [];
  for (const line of lines) {
    const { brand, product, size } = await createPurchasableProduct(line.unitPrice);
    const isHubFlow = line.fulfilmentMode === FulfilmentMode.OUTFIQE_LOGISTICS;
    const group = await prisma.orderFulfilmentGroup.create({
      data: {
        orderId: order.id,
        brandId: brand.id,
        fulfilmentMode: line.fulfilmentMode ?? FulfilmentMode.BRAND_SHIPS,
        pickupStatus: isHubFlow ? PickupStatus.AWAITING_BRAND : null,
        pickupCode: isHubFlow ? randomUUID().slice(0, 8).toUpperCase() : null,
      },
    });
    const item = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        productId: product.id,
        sizeId: size.id,
        qty: line.qty,
        unitPrice: line.unitPrice,
        listUnitPrice: line.unitPrice,
        platformDiscountAmount: line.platformDiscountAmount ?? NO_DISCOUNT,
        fulfilmentGroupId: group.id,
      },
    });
    const grossAmount = line.unitPrice * line.qty;
    await prisma.brandPayout.create({
      data: {
        orderItemId: item.id,
        brandId: brand.id,
        commissionRuleId: rule.id,
        platformCommissionTierId: tier.id,
        grossAmount,
        platformFee: platformFeeFor(grossAmount),
        netAmount: grossAmount - platformFeeFor(grossAmount),
        status: BrandPayoutStatus.PENDING,
      },
    });
    if (line.withCommission) {
      const creator = await createBuyer();
      const commissionTier = await prisma.commissionTier.create({
        data: { minPrice: 0, maxPrice: null, amount: COMMISSION_AMOUNT },
      });
      await prisma.creatorCommission.create({
        data: {
          creatorId: creator.id,
          orderItemId: item.id,
          source: CommissionSource.TAG_CLICK,
          tierId: commissionTier.id,
          amount: COMMISSION_AMOUNT,
          status: CommissionStatus.PENDING,
        },
      });
    }
    items.push({ item, group, size });
  }

  if (paymentStatus === PaymentStatus.PAID && paymentMethod !== PaymentMethod.COD) {
    await prisma.paymentTransaction.create({
      data: {
        orderId: order.id,
        provider: paymentMethod,
        type: PaymentTransactionType.PAYMENT,
        status: PaymentTransactionStatus.SUCCEEDED,
        rawResponse: { transaction_id: `txn-${randomUUID()}` },
      },
    });
  }

  const couponRecord = coupon
    ? await createCoupon(coupon.discountAmount, coupon.platformFundedAmount, admin.id)
    : null;
  if (couponRecord && coupon) {
    await prisma.couponRedemption.create({
      data: {
        couponId: couponRecord.id,
        userId: buyer.id,
        orderId: order.id,
        discountAmount: coupon.discountAmount,
        platformFundedAmount: coupon.platformFundedAmount,
      },
    });
  }

  return { order, buyer, items, coupon: couponRecord };
};
