import { randomUUID } from "node:crypto";

import { subDays } from "date-fns/subDays";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { FulfilmentStatus, PaymentMethod, PaymentStatus } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock("#lib/email.utils.js", () => ({ sendEmail: sendEmailMock }));

const { runStaleShipmentReminderDigest } = await import("./order.jobs.js");

const STALE_DAYS = 9;
const FRESH_DAYS = 2;

beforeEach(async () => {
  await redis.flushdb();
  sendEmailMock.mockClear();
});

const createBrand = async () =>
  prisma.brand.create({
    data: {
      name: `Reminder Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createShippedShipment = async (
  brandId: string,
  status: FulfilmentStatus,
  shippedDaysAgo: number,
) => {
  const buyer = await prisma.user.create({
    data: {
      email: `buyer-${randomUUID().slice(0, 8)}@outfiqe.test`,
      name: "Buyer",
      handle: `buyer-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
    },
  });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: 1000,
      deliveryFee: 0,
      total: 1000,
      paymentStatus: PaymentStatus.PAID,
    },
  });
  await prisma.orderFulfilmentGroup.create({
    data: {
      orderId: order.id,
      brandId,
      status,
      shippedAt: subDays(new Date(), shippedDaysAgo),
    },
  });
};

describe("runStaleShipmentReminderDigest", () => {
  it("emails only brands with a shipment stuck in Shipped past the window", async () => {
    const staleBrand = await createBrand();
    const freshBrand = await createBrand();
    const deliveredBrand = await createBrand();

    await createShippedShipment(staleBrand.id, FulfilmentStatus.SHIPPED, STALE_DAYS);
    await createShippedShipment(staleBrand.id, FulfilmentStatus.SHIPPED, STALE_DAYS + 1);
    await createShippedShipment(freshBrand.id, FulfilmentStatus.SHIPPED, FRESH_DAYS);
    await createShippedShipment(deliveredBrand.id, FulfilmentStatus.DELIVERED, STALE_DAYS);

    const result = await runStaleShipmentReminderDigest();

    expect(result.brandsNotified).toBe(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: staleBrand.email,
        subject: expect.stringContaining("2 shipments"),
      }),
    );
  });

  it("does nothing when there is no stale backlog", async () => {
    const brand = await createBrand();
    await createShippedShipment(brand.id, FulfilmentStatus.SHIPPED, FRESH_DAYS);

    const result = await runStaleShipmentReminderDigest();

    expect(result.brandsNotified).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
