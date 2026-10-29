import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { PaymentMethod, PaymentStatus, UserRole } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
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

describe("cancelling a whole order after cancelling one item", () => {
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
    const buyerAuthHeader = authHeaderFor(buyer.id, UserRole.CUSTOMER);
    const twoUnitSizeId = requireFixtureId(items[1]?.size.id);
    const stockBefore = await readStock(twoUnitSizeId);

    const lineCancellation = await request(testApp)
      .post(`/api/orders/${order.id}/line-cancellations`)
      .set("Authorization", buyerAuthHeader)
      .set(IDEMPOTENCY_HEADER, `cancel-${randomUUID()}`)
      .send({ lines: [{ orderItemId: requireFixtureId(items[1]?.item.id), qty: 1 }] });
    expect(lineCancellation.status).toBe(201);

    const wholeOrderCancellation = await request(testApp)
      .post(`/api/orders/${order.id}/cancel`)
      .set("Authorization", buyerAuthHeader)
      .send({ reason: "Changed my mind" });
    expect(wholeOrderCancellation.status).toBe(200);

    const unitsOrderedOfThatSize = 2;
    expect(await readStock(twoUnitSizeId)).toBe(stockBefore + unitsOrderedOfThatSize);
  });
});
