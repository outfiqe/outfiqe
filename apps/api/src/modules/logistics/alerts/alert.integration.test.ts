import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  FulfilmentMode,
  FulfilmentStatus,
  LogisticsAlertType,
  NotificationType,
  PickupStatus,
  ShipmentStatus,
  TrackingEventSource,
} from "#generated/prisma/enums.js";
import { utcMidnightToCalendarDate } from "#lib/working-days.utils.js";
import { orderFulfilmentGroupRepository } from "#modules/orders/fulfilment-groups/fulfilment-group.repository.js";
import { redis } from "#redis/redis.client.js";
import {
  createAdminSessionWithPlatformPermissions,
  createRoleLimitedStaffSession,
} from "#test/integration/auth-helpers.js";
import { createHubOrder, requireFixtureId } from "#test/integration/logistics-fixtures.js";
import { createParcelWithApiPartner } from "#test/integration/partner-connection-fixtures.js";
import { createOwnerSessionForBrand } from "#test/integration/refund-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

import { logisticsPartnerEvents } from "../logistics.partner-events.js";
import { logisticsAlertService } from "./alert.service.js";

const ALERTS_PATH = "/api/logistics/admin/alerts";
const DAYS_WAITING_FOR_BRAND = 5;
const DAYS_WITHOUT_PARTNER_UPDATE = 6;
const DAYS_PAST_PROMISE = 3;
const WEEKS_SINCE_SHIPPED = 3;
const DAYS_PER_WEEK = 7;

const findAlerts = (where: { fulfilmentGroupId?: string; shipmentId?: string; orderId?: string }) =>
  prisma.logisticsAlert.findMany({ where, orderBy: { alertType: "asc" } });

const countNotifications = (recipientId: string, type: NotificationType) =>
  prisma.notification.count({ where: { recipientId, type } });

const setUpWaitingBrand = async () => {
  const { order, hubGroupIds } = await createHubOrder();
  const groupId = requireFixtureId(hubGroupIds[0]);
  await prisma.orderFulfilmentGroup.update({
    where: { id: groupId },
    data: { pickupStatusChangedAt: subDays(new Date(), DAYS_WAITING_FOR_BRAND) },
  });
  const group = await prisma.orderFulfilmentGroup.findUniqueOrThrow({ where: { id: groupId } });
  return { order, groupId, brandId: group.brandId };
};

beforeEach(async () => {
  await redis.flushdb();
});

describe("time-limit alerts", () => {
  it("tells the brand, then ops, about a bag not marked ready, once, and clears it once ready", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const { groupId, brandId } = await setUpWaitingBrand();
    const owner = await createOwnerSessionForBrand(brandId);

    await logisticsAlertService.runLogisticsAlertSweep();
    await logisticsAlertService.runLogisticsAlertSweep();

    expect(
      (await findAlerts({ fulfilmentGroupId: groupId })).map(({ alertType }) => alertType),
    ).toEqual([LogisticsAlertType.BRAND_NOT_READY, LogisticsAlertType.BRAND_NOT_READY_ESCALATED]);
    expect(await countNotifications(owner.userId, NotificationType.LOGISTICS_BRAND_NOTICE)).toBe(1);
    expect(await countNotifications(staff.userId, NotificationType.LOGISTICS_STAFF_ALERT)).toBe(1);

    await prisma.orderFulfilmentGroup.update({
      where: { id: groupId },
      data: { pickupStatus: PickupStatus.READY_FOR_PICKUP },
    });
    await logisticsAlertService.runLogisticsAlertSweep();

    expect(await findAlerts({ fulfilmentGroupId: groupId })).toEqual([
      expect.objectContaining({ isAutoResolved: true, resolvedAt: expect.any(Date) }),
      expect.objectContaining({ isAutoResolved: true, resolvedAt: expect.any(Date) }),
    ]);
  });

  it("flags a parcel the partner has gone quiet on, and clears it on the next update", async () => {
    const { partner, shipment, partnerReference } = await createParcelWithApiPartner();
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { lastEventAt: subDays(new Date(), DAYS_WITHOUT_PARTNER_UPDATE) },
    });

    await logisticsAlertService.runLogisticsAlertSweep();
    expect(await findAlerts({ shipmentId: shipment.id })).toEqual([
      expect.objectContaining({
        alertType: LogisticsAlertType.NO_PARTNER_UPDATE,
        resolvedAt: null,
      }),
    ]);

    await logisticsPartnerEvents.applyPartnerTrackingEvent(
      partner.id,
      TrackingEventSource.PARTNER_IMPORT,
      {
        partnerReference,
        merchantReference: null,
        partnerEventId: null,
        rawStatus: "IN TRANSIT",
        occurredAt: new Date(),
        location: null,
        rawReason: null,
        codCollectedAmount: null,
        rawPayload: { status: "IN TRANSIT" },
      },
    );
    await logisticsAlertService.runLogisticsAlertSweep();

    expect(await findAlerts({ shipmentId: shipment.id })).toEqual([
      expect.objectContaining({ isAutoResolved: true, resolvedAt: expect.any(Date) }),
    ]);
  });

  it("says sorry to the customer when the delivery date has passed", async () => {
    const { order, buyer } = await createHubOrder();
    const promisedDay = utcMidnightToCalendarDate(subDays(new Date(), DAYS_PAST_PROMISE));
    await prisma.order.update({
      where: { id: order.id },
      data: { promisedDeliveryBy: new Date(`${promisedDay}T00:00:00.000Z`) },
    });

    await logisticsAlertService.runLogisticsAlertSweep();

    expect((await findAlerts({ orderId: order.id })).map(({ alertType }) => alertType)).toEqual(
      expect.arrayContaining([
        LogisticsAlertType.PROMISE_AT_RISK,
        LogisticsAlertType.PROMISE_MISSED,
      ]),
    );
    expect(await countNotifications(buyer.id, NotificationType.ORDER_DELIVERY_LATE)).toBe(1);
  });

  it("leaves hub orders out of the brand stale-shipment email", async () => {
    const { hubGroupIds, brandShippedGroupIds } = await createHubOrder({
      brandShippedBrandCount: 1,
    });
    const shippedAt = subDays(new Date(), WEEKS_SINCE_SHIPPED * DAYS_PER_WEEK);
    await prisma.orderFulfilmentGroup.updateMany({
      where: { id: { in: [...hubGroupIds, ...brandShippedGroupIds] } },
      data: { status: FulfilmentStatus.SHIPPED, shippedAt },
    });
    const [hubGroup, brandGroup] = await Promise.all([
      prisma.orderFulfilmentGroup.findUniqueOrThrow({
        where: { id: requireFixtureId(hubGroupIds[0]) },
      }),
      prisma.orderFulfilmentGroup.findUniqueOrThrow({
        where: { id: requireFixtureId(brandShippedGroupIds[0]) },
      }),
    ]);

    const staleBrands = await orderFulfilmentGroupRepository.listBrandsWithStaleShippedShipments(
      new Date(),
    );

    expect(hubGroup.fulfilmentMode).toBe(FulfilmentMode.OUTFIQE_LOGISTICS);
    expect(staleBrands.map(({ brandId }) => brandId)).toContain(brandGroup.brandId);
    expect(staleBrands.map(({ brandId }) => brandId)).not.toContain(hubGroup.brandId);
  });
});

describe("event alerts and the alerts list", () => {
  it("raises an alert for a status we don't know, and staff resolve it with a note", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const viewer = await createRoleLimitedStaffSession("platform:logistics:read");
    const { partner, shipment, partnerReference } = await createParcelWithApiPartner();
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: { status: ShipmentStatus.IN_TRANSIT },
    });

    await logisticsPartnerEvents.applyPartnerTrackingEvent(
      partner.id,
      TrackingEventSource.PARTNER_IMPORT,
      {
        partnerReference,
        merchantReference: null,
        partnerEventId: null,
        rawStatus: "PARKED AT DEPOT",
        occurredAt: new Date(),
        location: null,
        rawReason: null,
        codCollectedAmount: null,
        rawPayload: { status: "PARKED AT DEPOT" },
      },
    );
    const [alert] = await findAlerts({ shipmentId: shipment.id });
    if (!alert) throw new Error("No alert was raised");

    const listed = await request(testApp)
      .get(ALERTS_PATH)
      .query({ alertType: LogisticsAlertType.UNKNOWN_PARTNER_STATUS })
      .set("Authorization", viewer.authHeader);
    const viewerResolves = await request(testApp)
      .post(`${ALERTS_PATH}/${alert.id}/resolve`)
      .set("Authorization", viewer.authHeader)
      .send({ note: "Mapped the status" });
    const resolved = await request(testApp)
      .post(`${ALERTS_PATH}/${alert.id}/resolve`)
      .set("Authorization", staff.authHeader)
      .send({ note: "Mapped the status" });
    const resolvedAgain = await request(testApp)
      .post(`${ALERTS_PATH}/${alert.id}/resolve`)
      .set("Authorization", staff.authHeader)
      .send({ note: "Mapped the status" });

    expect(alert).toMatchObject({
      alertType: LogisticsAlertType.UNKNOWN_PARTNER_STATUS,
      detail: "PARKED AT DEPOT",
    });
    expect(listed.body.data.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: alert.id, trackingCode: shipment.trackingCode }),
      ]),
    );
    expect(listed.body.data.openCounts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ alertType: LogisticsAlertType.UNKNOWN_PARTNER_STATUS }),
      ]),
    );
    expect(viewerResolves.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(resolved.body.data).toMatchObject({
      resolutionNote: "Mapped the status",
      isAutoResolved: false,
    });
    expect(resolvedAgain.status).toBe(HTTP_STATUS.CONFLICT);
  });
});
