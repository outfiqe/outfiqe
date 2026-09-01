import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { RETURN_WINDOW_MS } from "#constants/settlement.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  ProductType,
  UserRole,
} from "#generated/prisma/enums.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { runBrandPayoutLifecycleSweep } from "./brandPayout.lifecycle.js";

const createBuyer = async () => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `lifecycle-buyer-${suffix}@outfiqe.test`,
      name: "Lifecycle Buyer",
      handle: `lifecycle-buyer-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

const createBrandPayoutFixture = async (order: {
  fulfilmentStatus: FulfilmentStatus;
  paymentStatus: PaymentStatus;
  deliveredAt: Date | null;
}) => {
  const admin = await prisma.user.create({
    data: {
      email: `lifecycle-admin-${randomUUID().slice(0, 8)}@outfiqe.test`,
      name: "Lifecycle Admin",
      handle: `lifecycle-admin-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });
  const rule = await prisma.platformCommissionRule.create({
    data: { isActive: true, updatedById: admin.id },
  });
  const brand = await prisma.brand.create({
    data: {
      name: `Lifecycle Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Lifecycle Item",
      price: 1000,
      type: ProductType.TOPS,
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 5 },
  });
  const buyer = await createBuyer();

  const created = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Lifecycle Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      fulfilmentStatus: order.fulfilmentStatus,
      paymentStatus: order.paymentStatus,
      deliveredAt: order.deliveredAt,
      subtotal: 1000,
      deliveryFee: 0,
      total: 1000,
      items: { create: [{ productId: product.id, sizeId: size.id, qty: 1, unitPrice: 1000 }] },
    },
    include: { items: true },
  });
  const orderItemId = created.items[0]?.id;
  if (!orderItemId) throw new Error("order item not created");

  return prisma.brandPayout.create({
    data: {
      orderItemId,
      brandId: brand.id,
      commissionRuleId: rule.id,
      grossAmount: 1000,
      platformFee: 120,
      gatewayFee: 0,
      netAmount: 880,
      status: BrandPayoutStatus.PENDING,
    },
  });
};

describe("runBrandPayoutLifecycleSweep", () => {
  it("moves a delivered payout past the return window to AVAILABLE", async () => {
    const payout = await createBrandPayoutFixture({
      fulfilmentStatus: FulfilmentStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      deliveredAt: new Date(Date.now() - RETURN_WINDOW_MS - 1000),
    });

    const result = await runBrandPayoutLifecycleSweep();
    expect(result.approved).toBeGreaterThanOrEqual(1);

    const updated = await prisma.brandPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(updated.status).toBe(BrandPayoutStatus.AVAILABLE);
    expect(updated.availableAt).not.toBeNull();
  });

  it("leaves a recently delivered payout PENDING (still inside the return window)", async () => {
    const payout = await createBrandPayoutFixture({
      fulfilmentStatus: FulfilmentStatus.DELIVERED,
      paymentStatus: PaymentStatus.PAID,
      deliveredAt: new Date(),
    });

    await runBrandPayoutLifecycleSweep();

    const updated = await prisma.brandPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(updated.status).toBe(BrandPayoutStatus.PENDING);
  });

  it("voids a payout whose order was cancelled", async () => {
    const payout = await createBrandPayoutFixture({
      fulfilmentStatus: FulfilmentStatus.CANCELLED,
      paymentStatus: PaymentStatus.REFUNDED,
      deliveredAt: null,
    });

    await runBrandPayoutLifecycleSweep();

    const updated = await prisma.brandPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(updated.status).toBe(BrandPayoutStatus.VOIDED);
    expect(updated.voidedReason).toBe("order cancelled");
  });

  it("voids a payout whose order payment failed", async () => {
    const payout = await createBrandPayoutFixture({
      fulfilmentStatus: FulfilmentStatus.PLACED,
      paymentStatus: PaymentStatus.FAILED,
      deliveredAt: null,
    });

    await runBrandPayoutLifecycleSweep();

    const updated = await prisma.brandPayout.findUniqueOrThrow({ where: { id: payout.id } });
    expect(updated.status).toBe(BrandPayoutStatus.VOIDED);
    expect(updated.voidedReason).toBe("payment failed or refunded");
  });
});
