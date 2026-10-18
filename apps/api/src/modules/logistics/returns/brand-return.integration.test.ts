import { subHours } from "date-fns/subHours";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandReturnStatus,
  ParcelReturnOutcome,
  PaymentMethod,
  PaymentStatus,
  PickupStatus,
  RiderStopDirection,
  RiderTaskStatus,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/auth-helpers.js";
import {
  createDefaultPickupLocation,
  createRiderSession,
  requireFixtureId,
} from "#test/integration/logistics-fixtures.js";
import { createOwnerSessionForBrand } from "#test/integration/refund-fixtures.js";
import { createParcelOnItsWayBack } from "#test/integration/return-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { logisticsBrandReturnService } from "./brand-return.service.js";
import { logisticsReturnCheckInService } from "./return-check-in.service.js";

const PICKUP_BOARD_PATH = "/api/logistics/admin/pickup-board";
const ADMIN_TASKS_PATH = "/api/logistics/admin/rider-tasks";
const RIDER_TASKS_PATH = "/api/logistics/rider/tasks";
const BRAND_RETURNS_PATH = "/api/logistics/brand/returns";
const HOURS_PAST_AUTO_CONFIRM = 49;
const UNITS_ORDERED = 2;
const RESELLABLE_UNITS = 1;

const setUpReturnAtHub = async () => {
  const {
    hub,
    order,
    shipment,
    items,
    staff: hubStaff,
  } = await createParcelOnItsWayBack({
    paymentMethod: PaymentMethod.COD,
    paymentStatus: PaymentStatus.DUE,
    lines: [{ unitPrice: 1000, qty: UNITS_ORDERED }],
  });
  const [orderLine] = items;
  if (!orderLine) throw new Error("The parcel fixture has no items");
  const { item, group, size } = orderLine;
  const pickupLocation = await createDefaultPickupLocation(group.brandId, "Kathmandu");
  await prisma.orderFulfilmentGroup.update({
    where: { id: group.id },
    data: { pickupLocationId: pickupLocation.id },
  });
  await logisticsReturnCheckInService.checkInReturnedParcel(hubStaff.userId, shipment.id, {
    outcome: ParcelReturnOutcome.CUSTOMER_REFUSED_OR_UNREACHABLE,
    lines: [
      {
        orderItemId: item.id,
        resellableQty: RESELLABLE_UNITS,
        damagedQty: UNITS_ORDERED - RESELLABLE_UNITS,
      },
    ],
  });
  const brandReturn = await prisma.brandReturn.findFirstOrThrow({
    where: { shipmentId: shipment.id },
  });
  const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
  const rider = await createRiderSession({ hubId: hub.id });
  const owner = await createOwnerSessionForBrand(group.brandId);
  return { hub, order, group, size, pickupLocation, brandReturn, staff, rider, owner };
};

const assignReturnVisit = (
  authHeader: string,
  {
    riderId,
    pickupLocationId,
    brandReturnId,
  }: { riderId: string; pickupLocationId: string; brandReturnId: string },
) =>
  request(testApp)
    .post(ADMIN_TASKS_PATH)
    .set("Authorization", authHeader)
    .send({
      riderId,
      pickupLocationId,
      brandReturnIds: [brandReturnId],
      roundStartsAt: new Date().toISOString(),
    });

const findBrandReturn = (brandReturnId: string) =>
  prisma.brandReturn.findUniqueOrThrow({ where: { id: brandReturnId } });

beforeEach(async () => {
  await redis.flushdb();
});

describe("taking returned items back to the brand", () => {
  it("puts the return on the board, a rider hands it over and the brand confirms it", async () => {
    const { group, size, pickupLocation, brandReturn, staff, rider, owner, hub } =
      await setUpReturnAtHub();

    const board = await request(testApp)
      .get(PICKUP_BOARD_PATH)
      .query({ hubId: hub.id })
      .set("Authorization", staff.authHeader);
    expect(board.body.data.items).toEqual([
      expect.objectContaining({
        pickupLocationId: pickupLocation.id,
        pickups: [],
        returns: [
          expect.objectContaining({ brandReturnId: brandReturn.id, unitCount: UNITS_ORDERED }),
        ],
      }),
    ]);

    const assigned = await assignReturnVisit(staff.authHeader, {
      riderId: rider.riderId,
      pickupLocationId: pickupLocation.id,
      brandReturnId: brandReturn.id,
    });
    expect(assigned.status).toBe(HTTP_STATUS.CREATED);
    expect((await findBrandReturn(brandReturn.id)).status).toBe(BrandReturnStatus.ON_ROUND);
    const taskId: string = assigned.body.data.id;

    const riderTask = await request(testApp)
      .get(`${RIDER_TASKS_PATH}/${taskId}`)
      .set("Authorization", rider.authHeader);
    expect(riderTask.body.data.stops).toEqual([
      expect.objectContaining({
        direction: RiderStopDirection.RETURN,
        brandReturn: expect.objectContaining({ brandReturnId: brandReturn.id }),
      }),
    ]);

    const droppedOff = await request(testApp)
      .post(`${RIDER_TASKS_PATH}/${taskId}/return-drop-offs`)
      .set("Authorization", rider.authHeader)
      .send({ brandReturnId: brandReturn.id });
    expect(droppedOff.status).toBe(HTTP_STATUS.OK);
    expect(droppedOff.body.data.status).toBe(RiderTaskStatus.COMPLETED);
    expect((await findBrandReturn(brandReturn.id)).status).toBe(BrandReturnStatus.DROPPED_OFF);
    expect(
      (await prisma.orderFulfilmentGroup.findUniqueOrThrow({ where: { id: group.id } }))
        .pickupStatus,
    ).toBe(PickupStatus.RETURNING_TO_BRAND);

    const stockBefore = (await prisma.productSize.findUniqueOrThrow({ where: { id: size.id } }))
      .stock;
    const listed = await request(testApp)
      .get(BRAND_RETURNS_PATH)
      .set("Authorization", owner.authHeader);
    const confirmed = await request(testApp)
      .post(`${BRAND_RETURNS_PATH}/${brandReturn.id}/confirm`)
      .set("Authorization", owner.authHeader);
    const confirmedAgain = await request(testApp)
      .post(`${BRAND_RETURNS_PATH}/${brandReturn.id}/confirm`)
      .set("Authorization", owner.authHeader);

    expect(listed.body.data.items).toEqual([
      expect.objectContaining({
        id: brandReturn.id,
        status: BrandReturnStatus.DROPPED_OFF,
        lines: [expect.objectContaining({ resellableQty: RESELLABLE_UNITS, damagedQty: 1 })],
      }),
    ]);
    expect(confirmed.status).toBe(HTTP_STATUS.OK);
    expect(confirmed.body.data).toMatchObject({
      status: BrandReturnStatus.CONFIRMED,
      isAutoConfirmed: false,
    });
    expect(confirmedAgain.status).toBe(HTTP_STATUS.CONFLICT);
    const stockAfter = (await prisma.productSize.findUniqueOrThrow({ where: { id: size.id } }))
      .stock;
    expect(stockAfter - stockBefore).toBe(RESELLABLE_UNITS);
    expect(
      (await prisma.orderFulfilmentGroup.findUniqueOrThrow({ where: { id: group.id } }))
        .pickupStatus,
    ).toBe(PickupStatus.RETURNED_TO_BRAND);
  });

  it("confirms a return the brand hasn't confirmed 48 hours after it was handed over", async () => {
    const { brandReturn, staff, rider, pickupLocation } = await setUpReturnAtHub();
    const assigned = await assignReturnVisit(staff.authHeader, {
      riderId: rider.riderId,
      pickupLocationId: pickupLocation.id,
      brandReturnId: brandReturn.id,
    });
    await request(testApp)
      .post(`${RIDER_TASKS_PATH}/${requireFixtureId(assigned.body.data.id)}/return-drop-offs`)
      .set("Authorization", rider.authHeader)
      .send({ brandReturnId: brandReturn.id });
    await prisma.brandReturn.update({
      where: { id: brandReturn.id },
      data: { droppedOffAt: subHours(new Date(), HOURS_PAST_AUTO_CONFIRM) },
    });

    await logisticsBrandReturnService.confirmOverdueBrandReturns();

    expect(await findBrandReturn(brandReturn.id)).toMatchObject({
      status: BrandReturnStatus.CONFIRMED,
      isAutoConfirmed: true,
      confirmedById: null,
    });
  });

  it("puts the return back at the hub when the visit is cancelled, and keeps it from other brands", async () => {
    const { brandReturn, staff, rider, pickupLocation } = await setUpReturnAtHub();
    const assigned = await assignReturnVisit(staff.authHeader, {
      riderId: rider.riderId,
      pickupLocationId: pickupLocation.id,
      brandReturnId: brandReturn.id,
    });
    const { owner: otherOwner } = await setUpReturnAtHub();

    const cancelled = await request(testApp)
      .post(`${ADMIN_TASKS_PATH}/${requireFixtureId(assigned.body.data.id)}/cancel`)
      .set("Authorization", staff.authHeader);
    const otherBrandConfirm = await request(testApp)
      .post(`${BRAND_RETURNS_PATH}/${brandReturn.id}/confirm`)
      .set("Authorization", otherOwner.authHeader);

    expect(cancelled.body.data.status).toBe(RiderTaskStatus.CANCELLED);
    expect((await findBrandReturn(brandReturn.id)).status).toBe(BrandReturnStatus.AT_HUB);
    expect(otherBrandConfirm.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it("won't put a return on a visit twice", async () => {
    const { brandReturn, staff, rider, pickupLocation } = await setUpReturnAtHub();
    const visit = {
      riderId: rider.riderId,
      pickupLocationId: pickupLocation.id,
      brandReturnId: brandReturn.id,
    };

    const first = await assignReturnVisit(staff.authHeader, visit);
    const second = await assignReturnVisit(staff.authHeader, visit);

    expect(first.status).toBe(HTTP_STATUS.CREATED);
    expect(second.status).toBe(HTTP_STATUS.CONFLICT);
  });
});
