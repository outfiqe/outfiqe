import { randomUUID } from "node:crypto";

import request from "supertest";

import { prisma } from "#db/prisma.js";
import { CouponType, PaymentMethod, ProductStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";

import { createAdminSession, grantPlatformPermissions } from "./auth-helpers.js";
import { ensureProductType } from "./product-fixtures.js";
import { testApp } from "./test-app.js";
import { uniquePhone } from "./unique-values.js";

export const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return `Bearer ${accessToken}`;
};

export const createCouponAdmin = async () => {
  const admin = await createAdminSession();
  await grantPlatformPermissions(admin.userId, "platform:coupons:manage");
  return admin;
};

export const createBuyer = async () => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `buyer-${suffix}@outfiqe.test`,
      name: "Test Buyer",
      handle: `test-buyer-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

export const createDefaultDeliveryZone = () =>
  prisma.deliveryZone.create({
    data: {
      name: "Default Zone",
      isDefault: true,
      standardDeliveryFee: 100,
      freeDeliveryThreshold: 100_000,
      codHandlingFee: 0,
    },
  });

export const createActiveCommissionRule = async (
  adminId: string,
  ratePercentBasisPoints = 1_000,
) => {
  await prisma.platformCommissionRule.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
  return prisma.platformCommissionRule.create({
    data: {
      isActive: true,
      updatedById: adminId,
      tiers: {
        create: [
          {
            minPrice: 0,
            maxPrice: null,
            feeType: "PERCENT",
            ratePercentBasisPoints,
            sortOrder: 0,
          },
        ],
      },
    },
  });
};

export const createPurchasableProduct = async (price: number, stock = 10) => {
  const brand = await prisma.brand.create({
    data: {
      name: `Coupon Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Coupon Jacket",
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock },
  });
  return { brand, product, size };
};

export const createCoupon = (overrides: {
  createdById: string;
  code?: string;
  type?: CouponType;
  fixedAmount?: number;
  percentBasisPoints?: number;
  maxDiscountAmount?: number;
  minSubtotal?: number;
  totalBudgetAmount?: number;
  prepaidOnly?: boolean;
  stacksWithBrandDiscount?: boolean;
}) =>
  prisma.coupon.create({
    data: {
      code: `TEST${randomUUID().slice(0, 6).toUpperCase()}`,
      type: CouponType.FIXED,
      fixedAmount: 400,
      startsAt: new Date(Date.now() - 1000),
      ...overrides,
    },
  });

export const BUDGET_ABOVE_THRESHOLD = 60_000;
export const BUDGET_BELOW_THRESHOLD = 10_000;

export const checkoutOnceWithCoupon = async (couponCode: string, price: number) => {
  const buyer = await createBuyer();
  const { product, size } = await createPurchasableProduct(price);
  await request(testApp)
    .post("/api/cart/items")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({ productId: product.id, sizeId: size.id, qty: 1 });
  await request(testApp)
    .post("/api/cart/coupon")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({ code: couponCode });
  const checkout = await request(testApp)
    .post("/api/orders/checkout")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({
      fullName: "Test Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
    });
  return { buyer, checkout };
};

export const checkoutRequest = (buyer: { id: string }, overrides: Record<string, unknown> = {}) =>
  request(testApp)
    .post("/api/orders/checkout")
    .set("Authorization", authHeaderFor(buyer.id))
    .send({
      fullName: "Test Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      ...overrides,
    });
