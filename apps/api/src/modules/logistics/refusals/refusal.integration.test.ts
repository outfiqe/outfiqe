import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { PaymentMethod, PaymentStatus, ShipmentStatus, UserRole } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/auth-helpers.js";
import {
  authHeaderFor,
  createActiveCommissionRule,
  createBuyer,
  createDefaultDeliveryZone,
  createPurchasableProduct,
} from "#test/integration/order-fixtures.js";
import { createParcelOnItsWayBack } from "#test/integration/return-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const BUYER_PHONE = "9811111111";
const BUYER_PHONE_E164 = "+9779811111111";
const DAYS_PAST_WINDOW = 400;
const REFUSALS_THAT_STOP_CASH_ON_DELIVERY = 2;

type RefusalFixtureOptions = {
  phoneE164?: string | null;
  refusedAt?: Date;
  refusalCount?: number;
};

const recordRefusals = async (
  userId: string,
  {
    phoneE164 = BUYER_PHONE_E164,
    refusedAt = new Date(),
    refusalCount = REFUSALS_THAT_STOP_CASH_ON_DELIVERY,
  }: RefusalFixtureOptions = {},
) => {
  await Promise.all(
    Array.from({ length: refusalCount }, async () => {
      const { order, shipment } = await createParcelOnItsWayBack({
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.DUE,
        lines: [{ unitPrice: 1000, qty: 1 }],
        shipmentStatus: ShipmentStatus.RETURNED_TO_HUB,
      });
      await prisma.customerDeliveryRefusal.create({
        data: { userId, phoneE164, orderId: order.id, shipmentId: shipment.id, refusedAt },
      });
    }),
  );
};

const getEligibility = (userId: string, phone?: string) =>
  request(testApp)
    .get("/api/logistics/cod-eligibility")
    .query(phone ? { phone } : {})
    .set("Authorization", authHeaderFor(userId, UserRole.CUSTOMER));

beforeEach(async () => {
  await redis.flushdb();
});

describe("cash on delivery after refusals", () => {
  it("is offered until the buyer has refused twice in a year, by account or by phone", async () => {
    const buyer = await createBuyer();
    const otherAccount = await createBuyer();

    expect((await getEligibility(buyer.id)).body.data).toMatchObject({
      isCashOnDeliveryAllowed: true,
      refusalCount: 0,
      refusalLimit: 2,
    });

    await recordRefusals(buyer.id);

    expect((await getEligibility(buyer.id)).body.data.isCashOnDeliveryAllowed).toBe(false);
    expect((await getEligibility(otherAccount.id)).body.data.isCashOnDeliveryAllowed).toBe(true);
    expect(
      (await getEligibility(otherAccount.id, BUYER_PHONE)).body.data.isCashOnDeliveryAllowed,
    ).toBe(false);
  });

  it("forgets refusals older than the window", async () => {
    const buyer = await createBuyer();
    await recordRefusals(buyer.id, { refusedAt: subDays(new Date(), DAYS_PAST_WINDOW) });

    expect((await getEligibility(buyer.id)).body.data.isCashOnDeliveryAllowed).toBe(true);
  });

  it("refuses a cash on delivery checkout and still allows paying online", async () => {
    const { userId: adminId } = await createAdminSession();
    await createActiveCommissionRule(adminId);
    await createDefaultDeliveryZone();
    const { product, size } = await createPurchasableProduct(1000);
    const buyer = await createBuyer();
    await recordRefusals(buyer.id, { phoneE164: null });
    const checkout = (paymentMethod: PaymentMethod) =>
      request(testApp)
        .post("/api/orders/checkout")
        .set("Authorization", authHeaderFor(buyer.id, UserRole.CUSTOMER))
        .send({
          fullName: "Test Buyer",
          phone: "9822222222",
          address: "Baneshwor",
          city: "Kathmandu",
          paymentMethod,
          buyNow: { productId: product.id, sizeId: size.id, qty: 1 },
        });

    const cashCheckout = await checkout(PaymentMethod.COD);

    expect(cashCheckout.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(cashCheckout.body.code).toBe("COD_UNAVAILABLE_REFUSALS");
    expect(await prisma.order.count({ where: { userId: buyer.id } })).toBe(0);
  });

  it("lets staff clear a customer's refusals with a reason, and writes it to the audit log", async () => {
    const buyer = await createBuyer();
    await recordRefusals(buyer.id);
    const { order } = await createParcelOnItsWayBack({
      paymentMethod: PaymentMethod.COD,
      paymentStatus: PaymentStatus.DUE,
      lines: [{ unitPrice: 1000, qty: 1 }],
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { userId: buyer.id, phone: BUYER_PHONE, phoneE164: BUYER_PHONE_E164 },
    });
    const admin = await createAdminSession();
    const refusalsPath = `/api/logistics/admin/orders/${order.id}/delivery-refusals`;

    const before = await request(testApp).get(refusalsPath).set("Authorization", admin.authHeader);
    const tooShort = await request(testApp)
      .post(`${refusalsPath}/clear`)
      .set("Authorization", admin.authHeader)
      .send({ reason: "ok" });
    const cleared = await request(testApp)
      .post(`${refusalsPath}/clear`)
      .set("Authorization", admin.authHeader)
      .send({ reason: "Hospital emergency, confirmed by phone" });

    expect(before.body.data).toMatchObject({ isCashOnDeliveryAllowed: false, refusalCount: 2 });
    expect(before.body.data.refusals).toHaveLength(2);
    expect(tooShort.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(cleared.status).toBe(HTTP_STATUS.OK);
    expect(cleared.body.data).toMatchObject({ isCashOnDeliveryAllowed: true, refusals: [] });
    expect(
      await prisma.platformAuditLog.count({
        where: { action: "logistics.delivery-refusals-cleared", targetId: order.id },
      }),
    ).toBe(1);
  });
});
