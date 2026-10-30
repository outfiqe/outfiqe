import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  FulfilmentStatus,
  PaymentMethod,
  PaymentStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import {
  enableOrderLogisticsForBrands,
  requireFixtureId,
} from "#test/integration/logistics-fixtures.js";
import { authHeaderFor } from "#test/integration/order-fixtures.js";
import { createRefundableOrder } from "#test/integration/refund-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
});

const readStock = async (sizeId: string): Promise<number> =>
  (await prisma.productSize.findUniqueOrThrow({ where: { id: sizeId } })).stock;

describe("marking an order returned after cancelling one item", () => {
  it("restocks each unit exactly once", async () => {
    const { order, items, buyer } = await createRefundableOrder({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [
        { unitPrice: 700, qty: 1 },
        { unitPrice: 300, qty: 2 },
      ],
    });
    await enableOrderLogisticsForBrands(items.map(({ group }) => group.brandId));
    const twoUnitSizeId = requireFixtureId(items[1]?.size.id);
    const stockBefore = await readStock(twoUnitSizeId);

    const lineCancellation = await request(testApp)
      .post(`/api/orders/${order.id}/line-cancellations`)
      .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
      .set(IDEMPOTENCY_HEADER, `cancel-${randomUUID()}`)
      .send({ lines: [{ orderItemId: requireFixtureId(items[1]?.item.id), qty: 1 }] });
    expect(lineCancellation.status).toBe(201);

    await prisma.order.update({
      where: { id: order.id },
      data: { fulfilmentStatus: FulfilmentStatus.SHIPPED },
    });
    const { authHeader: adminAuthHeader } = await createAdminSession();
    const returned = await request(testApp)
      .post(`/api/orders/admin/${order.id}/return`)
      .set("Authorization", adminAuthHeader)
      .send({ reason: "Parcel came back" });
    expect(returned.status).toBe(200);

    const unitsOrderedOfThatSize = 2;
    expect(await readStock(twoUnitSizeId)).toBe(stockBefore + unitsOrderedOfThatSize);
  });
});
