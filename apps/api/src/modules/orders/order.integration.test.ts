import { randomUUID } from "node:crypto";

import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { FulfilmentStatus, PaymentMethod, UserRole } from "#generated/prisma/enums.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";

const createBuyer = async () => {
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

const createOrder = async (userId: string, fulfilmentStatus: FulfilmentStatus = "PLACED") =>
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
