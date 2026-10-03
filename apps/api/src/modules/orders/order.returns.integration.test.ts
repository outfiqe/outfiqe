import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BrandPayoutStatus,
  CommissionSource,
  CommissionStatus,
  FulfilmentStatus,
  InventoryMovementKind,
  OrderFulfilmentSummary,
  PaymentMethod,
  PlatformFeeType,
  ProductStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const OK_STATUS = 200;
const CREATED_STATUS = 201;
const CONFLICT_STATUS = 409;
const STARTING_STOCK = 10;
const RETURN_REASON = "Parcel came back from Pathao";

beforeEach(async () => {
  await redis.flushdb();
});

const createBuyer = async () => {
  const suffix = randomUUID().slice(0, 8);
  const buyer = await prisma.user.create({
    data: {
      email: `return-buyer-${suffix}@outfiqe.test`,
      name: "Return Buyer",
      handle: `return-buyer-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
  const { accessToken } = generateTokenpair({ sub: buyer.id, role: UserRole.CUSTOMER });
  return { buyer, auth: `Bearer ${accessToken}` };
};

const placeCodOrder = async (adminId: string) => {
  await prisma.platformCommissionRule.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });
  await prisma.platformCommissionRule.create({
    data: {
      isActive: true,
      updatedById: adminId,
      tiers: {
        create: [
          {
            minPrice: 0,
            maxPrice: null,
            feeType: PlatformFeeType.PERCENT,
            ratePercentBasisPoints: 1_000,
            sortOrder: 0,
          },
        ],
      },
    },
  });
  await prisma.deliveryZone.create({
    data: {
      name: "Default Zone",
      isDefault: true,
      standardDeliveryFee: 100,
      freeDeliveryThreshold: 50_000,
      codHandlingFee: 0,
    },
  });
  const brand = await prisma.brand.create({
    data: {
      name: `Return Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Returnable Kurta",
      price: 2_000,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: STARTING_STOCK },
  });
  const { buyer, auth } = await createBuyer();
  const checkout = await request(testApp)
    .post("/api/orders/checkout")
    .set("Authorization", auth)
    .send({
      fullName: "Return Buyer",
      phone: "9800000000",
      address: "Baneshwor",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      buyNow: { productId: product.id, sizeId: size.id, qty: 1 },
    });
  expect(checkout.status).toBe(CREATED_STATUS);
  const orderItem = await prisma.orderItem.findFirstOrThrow({
    where: { orderId: checkout.body.data.id },
  });
  return { orderId: checkout.body.data.id, orderItemId: orderItem.id, sizeId: size.id, buyer };
};

const advanceTo = async (authHeader: string, orderId: string, statuses: FulfilmentStatus[]) => {
  for (const status of statuses) {
    const response = await request(testApp)
      .patch(`/api/orders/admin/${orderId}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status });
    expect(response.status).toBe(OK_STATUS);
  }
};

const addCommission = async (orderItemId: string, status: CommissionStatus) => {
  const creator = await createBuyer();
  const tier = await prisma.commissionTier.create({
    data: { minPrice: 0, maxPrice: null, amount: 75 },
  });
  return prisma.creatorCommission.create({
    data: {
      creatorId: creator.buyer.id,
      orderItemId,
      source: CommissionSource.TAG_CLICK,
      tierId: tier.id,
      amount: 75,
      status,
    },
  });
};

const markReturned = (authHeader: string, orderId: string) =>
  request(testApp)
    .post(`/api/orders/admin/${orderId}/return`)
    .set("Authorization", authHeader)
    .send({ reason: RETURN_REASON });

describe("POST /api/orders/admin/:orderId/return", () => {
  it("puts the stock back, voids unpaid earnings and records who did it", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    const { orderId, orderItemId, sizeId } = await placeCodOrder(adminId);
    await advanceTo(authHeader, orderId, [
      FulfilmentStatus.PACKED,
      FulfilmentStatus.SHIPPED,
      FulfilmentStatus.DELIVERED,
    ]);
    const commission = await addCommission(orderItemId, CommissionStatus.AVAILABLE);
    await prisma.brandPayout.updateMany({
      where: { orderItemId },
      data: { status: BrandPayoutStatus.AVAILABLE },
    });

    const response = await markReturned(authHeader, orderId);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toMatchObject({
      voidedCommissionCount: 1,
      voidedPayoutCount: 1,
      needsClawback: false,
    });
    const [order, size, voidedCommission, payout, restockEntry, auditEntry] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: orderId } }),
      prisma.productSize.findUniqueOrThrow({ where: { id: sizeId } }),
      prisma.creatorCommission.findUniqueOrThrow({ where: { id: commission.id } }),
      prisma.brandPayout.findUniqueOrThrow({ where: { orderItemId } }),
      prisma.inventoryLedgerEntry.findFirst({
        where: { sourceId: orderId, kind: InventoryMovementKind.ORDER_RESTORE },
      }),
      prisma.platformAuditLog.findFirst({
        where: { action: PLATFORM_AUDIT_ACTION.ORDER_RETURNED_TO_ORIGIN, targetId: orderId },
      }),
    ]);
    expect(order.fulfilmentStatus).toBe(FulfilmentStatus.RETURNED);
    expect(order.fulfilmentSummary).toBe(OrderFulfilmentSummary.RETURNED);
    expect(order.returnReason).toBe(RETURN_REASON);
    expect(size.stock).toBe(STARTING_STOCK);
    expect(voidedCommission.status).toBe(CommissionStatus.VOIDED);
    expect(payout.status).toBe(BrandPayoutStatus.VOIDED);
    expect(restockEntry?.delta).toBe(1);
    expect(auditEntry?.actorUserId).toBe(adminId);
  });

  it("flags earnings that were already paid out, so finance can claw them back", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    const { orderId, orderItemId } = await placeCodOrder(adminId);
    await advanceTo(authHeader, orderId, [FulfilmentStatus.PACKED, FulfilmentStatus.SHIPPED]);
    const paidCommission = await addCommission(orderItemId, CommissionStatus.PAID);

    const response = await markReturned(authHeader, orderId);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toMatchObject({ paidCommissionCount: 1, needsClawback: true });
    const untouched = await prisma.creatorCommission.findUniqueOrThrow({
      where: { id: paidCommission.id },
    });
    expect(untouched.status).toBe(CommissionStatus.PAID);
  });

  it("only returns orders that have shipped, and only once", async () => {
    const { userId: adminId, authHeader } = await createAdminSession();
    const { orderId } = await placeCodOrder(adminId);

    const beforeShipping = await markReturned(authHeader, orderId);
    await advanceTo(authHeader, orderId, [FulfilmentStatus.PACKED, FulfilmentStatus.SHIPPED]);
    const firstReturn = await markReturned(authHeader, orderId);
    const secondReturn = await markReturned(authHeader, orderId);

    expect(beforeShipping.status).toBe(CONFLICT_STATUS);
    expect(firstReturn.status).toBe(OK_STATUS);
    expect(secondReturn.status).toBe(CONFLICT_STATUS);
    const restockEntries = await prisma.inventoryLedgerEntry.count({
      where: { sourceId: orderId, kind: InventoryMovementKind.ORDER_RESTORE },
    });
    expect(restockEntries).toBe(1);
  });
});
