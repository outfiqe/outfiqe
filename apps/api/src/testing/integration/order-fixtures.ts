import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import type { FulfilmentStatus } from "#generated/prisma/enums.js";
import {
  DiscountType,
  PaymentMethod,
  PlatformFeeType,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";

import { ensureProductType } from "./product-fixtures.js";
import { uniquePhone } from "./unique-values.js";

export const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

export const createDefaultDeliveryZone = () =>
  prisma.deliveryZone.create({
    data: {
      name: "Default Zone",
      isDefault: true,
      standardDeliveryFee: 100,
      freeDeliveryThreshold: 5000,
      codHandlingFee: 0,
    },
  });

export const createPurchasableProduct = async (price: number) => {
  const brand = await prisma.brand.create({
    data: {
      name: `Checkout Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Brand Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Checkout Jacket",
      price,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 10 },
  });
  return { brand, product, size };
};

export const createProductDiscount = (
  productId: string,
  createdById: string,
  overrides: Partial<{
    discountType: DiscountType;
    percentBasisPoints: number | null;
    fixedAmount: number | null;
    startsAt: Date;
    endsAt: Date | null;
  }> = {},
) =>
  prisma.productDiscount.create({
    data: {
      productId,
      createdById,
      discountType: DiscountType.PERCENT,
      percentBasisPoints: 2_000,
      fixedAmount: null,
      startsAt: new Date(Date.now() - 1000),
      endsAt: null,
      ...overrides,
    },
  });

export const createActiveCommissionRule = async (
  adminId: string,
  ratePercentBasisPoints = 1200,
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
            feeType: PlatformFeeType.PERCENT,
            ratePercentBasisPoints,
            sortOrder: 0,
          },
        ],
      },
    },
    include: { tiers: true },
  });
};

export const createActiveEsewaGatewayFeeRate = async (
  adminId: string,
  ratePercentBasisPoints = 200,
) => {
  await prisma.gatewayFeeRate.deleteMany({ where: { paymentMethod: PaymentMethod.ESEWA } });
  return prisma.gatewayFeeRate.create({
    data: {
      paymentMethod: PaymentMethod.ESEWA,
      ratePercentBasisPoints,
      isActive: true,
      updatedById: adminId,
    },
  });
};

export const createBuyer = async () => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `buyer-${suffix}@outfiqe.test`,
      name: "Test Buyer",
      handle: `test-buyer-${suffix}`,
      phone: `97${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

export const createUserWithRole = async (role: UserRole) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `${role.toLowerCase()}-${suffix}@outfiqe.test`,
      name: `Test ${role}`,
      handle: `test-${role.toLowerCase()}-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
};

export const createOrder = async (userId: string, fulfilmentStatus: FulfilmentStatus = "PLACED") =>
  prisma.order.create({
    data: {
      userId,
      fullName: "Test Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      fulfilmentStatus,
      subtotal: 1000,
      deliveryFee: 100,
      total: 1100,
    },
  });
