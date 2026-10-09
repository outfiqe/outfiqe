import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { FulfilmentStatus } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import { createBuyer, createOrder } from "#test/integration/order-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

beforeEach(async () => {
  await redis.flushdb();
});

describe("PATCH /api/orders/admin/:orderId/fulfilment", () => {
  it("returns 404 for an unknown order id", async () => {
    const { authHeader } = await createAdminSession();

    const response = await request(testApp)
      .patch(`/api/orders/admin/${randomUUID()}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.PACKED });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("NOT_FOUND");
  });

  it("advances a placed order to packed", async () => {
    const { authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const order = await createOrder(buyer.id);

    const response = await request(testApp)
      .patch(`/api/orders/admin/${order.id}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.PACKED });

    expect(response.status).toBe(200);

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updated.fulfilmentStatus).toBe(FulfilmentStatus.PACKED);
  });

  it("rejects an invalid transition", async () => {
    const { authHeader } = await createAdminSession();
    const buyer = await createBuyer();
    const order = await createOrder(buyer.id, FulfilmentStatus.PLACED);

    const response = await request(testApp)
      .patch(`/api/orders/admin/${order.id}/fulfilment`)
      .set("Authorization", authHeader)
      .send({ status: FulfilmentStatus.DELIVERED });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("INVALID_TRANSITION");
  });
});
