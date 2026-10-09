import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import type { WithdrawOwnerType } from "#generated/prisma/enums.js";
import {
  BankType,
  BrandPayoutStatus,
  BrandRole,
  CommissionSource,
  CommissionStatus,
  CreatorStatus,
  PaymentMethod,
  ProductStatus,
  UserRole,
  WithdrawWindowType,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";

import { ensureProductType } from "./product-fixtures.js";
import { uniquePhone } from "./unique-values.js";

export const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

export const createUser = async (
  role: UserRole = UserRole.CUSTOMER,
  name = "Withdraw Tester",
  { approvedCreator = role === UserRole.CUSTOMER }: { approvedCreator?: boolean } = {},
) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `withdraw-tester-${suffix}@outfiqe.test`,
      name,
      handle: `withdraw-tester-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
      isCreator: approvedCreator,
      creatorStatus: approvedCreator ? CreatorStatus.APPROVED : CreatorStatus.NONE,
    },
  });
};

const deactivateExistingActivePolicy = (ownerType: WithdrawOwnerType) =>
  prisma.withdrawPolicy.updateMany({
    where: { ownerType, isActive: true },
    data: { isActive: false },
  });

export const createOpenPolicy = async (
  ownerType: WithdrawOwnerType,
  overrides: Partial<Record<string, unknown>> = {},
) => {
  await deactivateExistingActivePolicy(ownerType);
  const admin = await createUser(UserRole.ADMIN);
  return prisma.withdrawPolicy.create({
    data: {
      ownerType,
      minAmount: 500,
      maxAmount: 100_000,
      windowType: WithdrawWindowType.CUSTOM_DAYS,
      windowValue: 1,
      maxAttemptsPerWindow: 1,
      cooldownAfterRejectionDays: 7,
      processingNoteText: "Processed manually.",
      isActive: true,
      updatedById: admin.id,
      ...overrides,
    },
  });
};

export const createClosedPolicy = async (ownerType: WithdrawOwnerType) => {
  await deactivateExistingActivePolicy(ownerType);
  const admin = await createUser(UserRole.ADMIN);
  return prisma.withdrawPolicy.create({
    data: {
      ownerType,
      minAmount: 500,
      maxAmount: 100_000,
      windowType: WithdrawWindowType.CUSTOM_DAYS,
      windowValue: 30,
      maxAttemptsPerWindow: 1,
      cooldownAfterRejectionDays: 7,
      processingNoteText: "Processed manually.",
      isActive: true,
      updatedById: admin.id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });
};

const createBank = () =>
  prisma.nepalBank.create({
    data: {
      name: `Bank ${randomUUID().slice(0, 6)}`,
      code: randomUUID().slice(0, 8).toUpperCase(),
      type: BankType.COMMERCIAL,
      isActive: true,
    },
  });

export const createVerifiedBankAccount = async (userId: string) => {
  const bank = await createBank();
  return prisma.bankAccount.create({
    data: {
      userId,
      bankId: bank.id,
      accountName: "Account Holder",
      accountNumberCiphertext: "fake.fake.fake",
      accountNumberLast4: "1234",
      branchName: "Branch",
      isDefault: true,
      isVerified: true,
    },
  });
};

export const createVerifiedBrandBankAccount = async (brandId: string) => {
  const bank = await createBank();
  return prisma.brandBankAccount.create({
    data: {
      brandId,
      bankId: bank.id,
      accountName: "Brand Account",
      accountNumberCiphertext: "fake.fake.fake",
      accountNumberLast4: "5678",
      branchName: "Branch",
      isDefault: true,
      isVerified: true,
    },
  });
};

export const grantAvailableCommission = async (creatorId: string, amount: number) => {
  const tier = await prisma.commissionTier.create({
    data: { minPrice: 0, maxPrice: null, amount, sortOrder: 0 },
  });
  const buyer = await createUser(UserRole.CUSTOMER);
  const brand = await prisma.brand.create({
    data: {
      name: `Commission Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Item",
      price: amount,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 5 },
  });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: amount,
      deliveryFee: 0,
      total: amount,
      items: {
        create: [
          {
            productId: product.id,
            sizeId: size.id,
            qty: 1,
            unitPrice: amount,
            listUnitPrice: amount,
          },
        ],
      },
    },
    include: { items: true },
  });
  const orderItemId = order.items[0]?.id;
  if (!orderItemId) throw new Error("order item not created");

  await prisma.creatorCommission.create({
    data: {
      creatorId,
      orderItemId,
      source: CommissionSource.TAG_CLICK,
      tierId: tier.id,
      amount,
      status: CommissionStatus.AVAILABLE,
    },
  });
};

export const grantAvailableBrandPayout = async (brandId: string, netAmount: number) => {
  const admin = await createUser(UserRole.ADMIN);
  const rule = await prisma.platformCommissionRule.create({
    data: { isActive: true, updatedById: admin.id },
  });
  const buyer = await createUser(UserRole.CUSTOMER);
  const product = await prisma.product.create({
    data: {
      brandId,
      name: "Item",
      price: netAmount,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 5 },
  });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: netAmount,
      deliveryFee: 0,
      total: netAmount,
      items: {
        create: [
          {
            productId: product.id,
            sizeId: size.id,
            qty: 1,
            unitPrice: netAmount,
            listUnitPrice: netAmount,
          },
        ],
      },
    },
    include: { items: true },
  });
  const orderItemId = order.items[0]?.id;
  if (!orderItemId) throw new Error("order item not created");

  await prisma.brandPayout.create({
    data: {
      orderItemId,
      brandId,
      commissionRuleId: rule.id,
      grossAmount: netAmount,
      platformFee: 0,
      gatewayFee: 0,
      netAmount,
      status: BrandPayoutStatus.AVAILABLE,
    },
  });
};

export const createBrandWithMember = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Wallet Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const member = await createUser(UserRole.BRAND_OWNER);
  await prisma.brandMembership.create({
    data: { userId: member.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  return { brand, member };
};
