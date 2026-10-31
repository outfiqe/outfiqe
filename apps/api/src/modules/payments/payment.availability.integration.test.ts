import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { PaymentMethod, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { turnKhaltiOff, turnKhaltiOn } from "#test/integration/khalti-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

import { assertGatewayAvailable } from "./payment.availability.js";

const UNKNOWN_USER_ID = "00000000-0000-4000-8000-000000000000";

const createKhaltiOrderAwaitingPayment = async () => {
  const suffix = randomUUID().slice(0, 8);
  const buyer = await prisma.user.create({
    data: {
      email: `khalti-switch-${suffix}@outfiqe.test`,
      name: "Khalti Switch Buyer",
      handle: `khalti-switch-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Khalti Switch Buyer",
      phone: "9800000000",
      address: "123 Test Street",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.KHALTI,
      subtotal: 1000,
      deliveryFee: 100,
      total: 1100,
    },
  });
  return { buyer, order };
};

const resumePayment = (orderId: string, userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.CUSTOMER });
  return request(testApp)
    .post(`/api/payments/${orderId}/initiate`)
    .set("Authorization", `Bearer ${accessToken}`);
};

describe("assertGatewayAvailable", () => {
  beforeEach(async () => {
    await turnKhaltiOff();
  });

  it("refuses Khalti while its switch is off", async () => {
    await expect(
      assertGatewayAvailable(PaymentMethod.KHALTI, UNKNOWN_USER_ID),
    ).rejects.toMatchObject({ code: "KHALTI_UNAVAILABLE" });
  });

  it("allows Khalti once its switch is on", async () => {
    await turnKhaltiOn();

    await expect(
      assertGatewayAvailable(PaymentMethod.KHALTI, UNKNOWN_USER_ID),
    ).resolves.toBeUndefined();
  });

  it("never blocks eSewa or cash on delivery", async () => {
    await expect(
      assertGatewayAvailable(PaymentMethod.ESEWA, UNKNOWN_USER_ID),
    ).resolves.toBeUndefined();
    await expect(
      assertGatewayAvailable(PaymentMethod.COD, UNKNOWN_USER_ID),
    ).resolves.toBeUndefined();
  });

  it("refuses to resume an unpaid Khalti order while its switch is off", async () => {
    const { buyer, order } = await createKhaltiOrderAwaitingPayment();

    const response = await resumePayment(order.id, buyer.id);

    expect(response.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(response.body.code).toBe("KHALTI_UNAVAILABLE");
  });
});
