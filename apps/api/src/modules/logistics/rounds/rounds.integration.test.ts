import { randomUUID } from "node:crypto";

import { subHours } from "date-fns/subHours";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  FulfilmentStatus,
  PickupStatus,
  RiderStatus,
  RiderTaskStatus,
  TrackingEventCode,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSessionWithPlatformPermissions } from "#test/integration/auth-helpers.js";
import {
  createBagTag,
  createHub,
  createReadyPickupsAtLocation,
  createRiderSession,
  requireFixtureId,
} from "#test/integration/logistics-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

const PICKUP_BOARD_PATH = "/api/logistics/admin/pickup-board";
const ADMIN_TASKS_PATH = "/api/logistics/admin/rider-tasks";
const RIDER_TASKS_PATH = "/api/logistics/rider/tasks";
const ONE_PICKUP = 1;
const TWO_PICKUPS = 2;
const ONE_EVENT = 1;
const STALE_SCAN_HOURS = 30;
const NOTHING_COLLECTED = 0;

const collectPath = (taskId: string) => `${RIDER_TASKS_PATH}/${taskId}/collect-scans`;

const newIdempotencyKey = () => `scan-${randomUUID()}`;

const setUpVisit = async (pickupCount: number) => {
  const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
  const hub = await createHub();
  const rider = await createRiderSession({ hubId: hub.id });
  const { pickupLocation, groups } = await createReadyPickupsAtLocation(hub.id, pickupCount);

  const assigned = await request(testApp)
    .post(ADMIN_TASKS_PATH)
    .set("Authorization", staff.authHeader)
    .send({
      riderId: rider.riderId,
      pickupLocationId: pickupLocation.id,
      fulfilmentGroupIds: groups.map((group) => group.id),
      roundStartsAt: new Date().toISOString(),
    });
  const taskId: string = assigned.body.data.id;
  return { staff, hub, rider, pickupLocation, groups, taskId, assigned };
};

const sendCollectScan = (
  authHeader: string,
  taskId: string,
  scan: { pickupCode: string; bagTagCode: string; scannedAt?: string },
  idempotencyKey: string = newIdempotencyKey(),
) =>
  request(testApp)
    .post(collectPath(taskId))
    .set("Authorization", authHeader)
    .set(IDEMPOTENCY_HEADER, idempotencyKey)
    .send({ scannedAt: new Date().toISOString(), ...scan });

beforeEach(async () => {
  await redis.flushdb();
});

describe("pickup board and visit assignment", () => {
  it("shows ready pickups by location until they are assigned", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const hub = await createHub();
    const rider = await createRiderSession({ hubId: hub.id });
    const { pickupLocation, groups } = await createReadyPickupsAtLocation(hub.id, TWO_PICKUPS);

    const board = await request(testApp)
      .get(PICKUP_BOARD_PATH)
      .query({ hubId: hub.id })
      .set("Authorization", staff.authHeader);
    expect(board.body.data.items).toEqual([
      expect.objectContaining({
        pickupLocationId: pickupLocation.id,
        pickups: expect.arrayContaining(
          groups.map((group) => expect.objectContaining({ fulfilmentGroupId: group.id })),
        ),
      }),
    ]);

    const assigned = await request(testApp)
      .post(ADMIN_TASKS_PATH)
      .set("Authorization", staff.authHeader)
      .send({
        riderId: rider.riderId,
        pickupLocationId: pickupLocation.id,
        fulfilmentGroupIds: groups.map((group) => group.id),
        roundStartsAt: new Date().toISOString(),
      });
    expect(assigned.status).toBe(201);
    expect(assigned.body.data).toMatchObject({
      stopCount: TWO_PICKUPS,
      collectedCount: NOTHING_COLLECTED,
    });
    expect(
      await prisma.trackingEvent.count({ where: { code: TrackingEventCode.RIDER_ASSIGNED } }),
    ).toBeGreaterThanOrEqual(TWO_PICKUPS);

    const boardAfter = await request(testApp)
      .get(PICKUP_BOARD_PATH)
      .query({ hubId: hub.id })
      .set("Authorization", staff.authHeader);
    expect(boardAfter.body.data.items).toEqual([]);
  });

  it("refuses to put the same pickup on two visits", async () => {
    const { staff, rider, pickupLocation, groups } = await setUpVisit(ONE_PICKUP);

    const second = await request(testApp)
      .post(ADMIN_TASKS_PATH)
      .set("Authorization", staff.authHeader)
      .send({
        riderId: rider.riderId,
        pickupLocationId: pickupLocation.id,
        fulfilmentGroupIds: groups.map((group) => group.id),
        roundStartsAt: new Date().toISOString(),
      });

    expect(second.status).toBe(409);
    expect(second.body.code).toBe("PICKUPS_NOT_ASSIGNABLE");
  });

  it("refuses a rider who is not active", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const hub = await createHub();
    const rider = await createRiderSession({ hubId: hub.id, status: RiderStatus.SUSPENDED });
    const { pickupLocation, groups } = await createReadyPickupsAtLocation(hub.id, ONE_PICKUP);

    const response = await request(testApp)
      .post(ADMIN_TASKS_PATH)
      .set("Authorization", staff.authHeader)
      .send({
        riderId: rider.riderId,
        pickupLocationId: pickupLocation.id,
        fulfilmentGroupIds: groups.map((group) => group.id),
        roundStartsAt: new Date().toISOString(),
      });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("RIDER_NOT_ACTIVE");
  });

  it("cancels an untouched visit and puts its pickups back on the board", async () => {
    const { staff, hub, taskId } = await setUpVisit(ONE_PICKUP);

    const cancelled = await request(testApp)
      .post(`${ADMIN_TASKS_PATH}/${taskId}/cancel`)
      .set("Authorization", staff.authHeader);
    const board = await request(testApp)
      .get(PICKUP_BOARD_PATH)
      .query({ hubId: hub.id })
      .set("Authorization", staff.authHeader);

    expect(cancelled.body.data.status).toBe(RiderTaskStatus.CANCELLED);
    expect(board.body.data.items).toHaveLength(ONE_PICKUP);
  });
});

describe("rider collection scans", () => {
  it("collects a bag, records the events and finishes the visit", async () => {
    const { staff, hub, rider, groups, taskId } = await setUpVisit(ONE_PICKUP);
    const group = groups[0];
    const pickupCode = requireFixtureId(group?.pickupCode ?? undefined);
    const bagTag = await createBagTag(hub.id, staff.userId);

    const visits = await request(testApp)
      .get(RIDER_TASKS_PATH)
      .set("Authorization", rider.authHeader);
    expect(visits.body.data.tasks).toEqual([expect.objectContaining({ id: taskId })]);

    const response = await sendCollectScan(rider.authHeader, taskId, {
      pickupCode: pickupCode.toLowerCase(),
      bagTagCode: bagTag.code,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(RiderTaskStatus.COMPLETED);
    expect(response.body.data.stops).toEqual([
      expect.objectContaining({ isCollected: true, bagTagCode: bagTag.code }),
    ]);
    const collectedGroup = await prisma.orderFulfilmentGroup.findUniqueOrThrow({
      where: { id: requireFixtureId(group?.id) },
    });
    expect(collectedGroup.pickupStatus).toBe(PickupStatus.PICKED_UP);
    expect(collectedGroup.status).toBe(FulfilmentStatus.PACKED);
    expect(collectedGroup.pickedUpAt).not.toBeNull();
    expect(
      await prisma.trackingEvent.count({
        where: { fulfilmentGroupId: collectedGroup.id, code: TrackingEventCode.BAG_TAGGED },
      }),
    ).toBe(ONE_EVENT);
  });

  it("replays an offline retry with the same key without scanning twice", async () => {
    const { staff, hub, rider, groups, taskId } = await setUpVisit(ONE_PICKUP);
    const pickupCode = requireFixtureId(groups[0]?.pickupCode ?? undefined);
    const bagTag = await createBagTag(hub.id, staff.userId);
    const idempotencyKey = newIdempotencyKey();
    const scan = { pickupCode, bagTagCode: bagTag.code, scannedAt: new Date().toISOString() };

    const first = await sendCollectScan(rider.authHeader, taskId, scan, idempotencyKey);
    const retry = await sendCollectScan(rider.authHeader, taskId, scan, idempotencyKey);
    const retryWithNewKey = await sendCollectScan(rider.authHeader, taskId, scan);

    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(retryWithNewKey.status).toBe(200);
    expect(
      await prisma.trackingEvent.count({
        where: { fulfilmentGroupId: groups[0]?.id, code: TrackingEventCode.PICKED_UP },
      }),
    ).toBe(ONE_EVENT);
  });

  it("lets only one of two parallel scans use the same sticker", async () => {
    const { staff, hub, rider, groups, taskId } = await setUpVisit(TWO_PICKUPS);
    const bagTag = await createBagTag(hub.id, staff.userId);

    const responses = await Promise.all(
      groups.map((group) =>
        sendCollectScan(rider.authHeader, taskId, {
          pickupCode: requireFixtureId(group.pickupCode ?? undefined),
          bagTagCode: bagTag.code,
        }),
      ),
    );

    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([200, 409]);
    expect(
      await prisma.trackingEvent.count({
        where: {
          fulfilmentGroupId: { in: groups.map((group) => group.id) },
          code: TrackingEventCode.BAG_TAGGED,
        },
      }),
    ).toBe(ONE_EVENT);
  });

  it("refuses a sticker from another hub and a pickup code from another visit", async () => {
    const { staff, hub, rider, groups, taskId } = await setUpVisit(ONE_PICKUP);
    const otherHub = await createHub();
    const foreignTag = await createBagTag(otherHub.id, staff.userId);
    const ownTag = await createBagTag(hub.id, staff.userId);

    const wrongHub = await sendCollectScan(rider.authHeader, taskId, {
      pickupCode: requireFixtureId(groups[0]?.pickupCode ?? undefined),
      bagTagCode: foreignTag.code,
    });
    const wrongCode = await sendCollectScan(rider.authHeader, taskId, {
      pickupCode: "ZZZZZZZZ",
      bagTagCode: ownTag.code,
    });

    expect(wrongHub.body.code).toBe("BAG_TAG_WRONG_HUB");
    expect(wrongCode.body.code).toBe("PICKUP_NOT_ON_TASK");
  });

  it("refuses a scan that is too old to trust", async () => {
    const { staff, hub, rider, groups, taskId } = await setUpVisit(ONE_PICKUP);
    const bagTag = await createBagTag(hub.id, staff.userId);

    const response = await sendCollectScan(rider.authHeader, taskId, {
      pickupCode: requireFixtureId(groups[0]?.pickupCode ?? undefined),
      bagTagCode: bagTag.code,
      scannedAt: subHours(new Date(), STALE_SCAN_HOURS).toISOString(),
    });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe("SCAN_TOO_OLD");
  });

  it("refuses to collect an order cancelled after the visit was planned", async () => {
    const { staff, hub, rider, groups, taskId } = await setUpVisit(ONE_PICKUP);
    const bagTag = await createBagTag(hub.id, staff.userId);
    await prisma.orderFulfilmentGroup.update({
      where: { id: requireFixtureId(groups[0]?.id) },
      data: { pickupStatus: PickupStatus.CANCELLED },
    });

    const response = await sendCollectScan(rider.authHeader, taskId, {
      pickupCode: requireFixtureId(groups[0]?.pickupCode ?? undefined),
      bagTagCode: bagTag.code,
    });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("PICKUP_NOT_READY");
  });

  it("needs an idempotency key on every scan", async () => {
    const { rider, groups, taskId } = await setUpVisit(ONE_PICKUP);

    const response = await request(testApp)
      .post(collectPath(taskId))
      .set("Authorization", rider.authHeader)
      .send({
        pickupCode: groups[0]?.pickupCode,
        bagTagCode: "ABCDEFGHJK",
        scannedAt: new Date().toISOString(),
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
  });

  it("hides another rider's visit", async () => {
    const { hub, taskId } = await setUpVisit(ONE_PICKUP);
    const otherRider = await createRiderSession({ hubId: hub.id });

    const response = await request(testApp)
      .get(`${RIDER_TASKS_PATH}/${taskId}`)
      .set("Authorization", otherRider.authHeader);

    expect(response.status).toBe(404);
  });
});

describe("visits that do not go to plan", () => {
  it("marks a wasted visit and puts the pickups back on the board", async () => {
    const { staff, hub, rider, groups, taskId } = await setUpVisit(ONE_PICKUP);

    const response = await request(testApp)
      .post(`${RIDER_TASKS_PATH}/${taskId}/wasted`)
      .set("Authorization", rider.authHeader)
      .send({ reason: "Shop was closed" });
    const board = await request(testApp)
      .get(PICKUP_BOARD_PATH)
      .query({ hubId: hub.id })
      .set("Authorization", staff.authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe(RiderTaskStatus.WASTED);
    expect(board.body.data.items).toHaveLength(ONE_PICKUP);
    expect(
      await prisma.trackingEvent.count({
        where: { fulfilmentGroupId: groups[0]?.id, code: TrackingEventCode.VISIT_WASTED },
      }),
    ).toBe(ONE_EVENT);
  });

  it("finishes a partly collected visit and frees the bag that was not ready", async () => {
    const { staff, hub, rider, groups, taskId } = await setUpVisit(TWO_PICKUPS);
    const bagTag = await createBagTag(hub.id, staff.userId);
    await sendCollectScan(rider.authHeader, taskId, {
      pickupCode: requireFixtureId(groups[0]?.pickupCode ?? undefined),
      bagTagCode: bagTag.code,
    });

    const wasted = await request(testApp)
      .post(`${RIDER_TASKS_PATH}/${taskId}/wasted`)
      .set("Authorization", rider.authHeader)
      .send({ reason: "Shop was closed" });
    const finished = await request(testApp)
      .post(`${RIDER_TASKS_PATH}/${taskId}/finish`)
      .set("Authorization", rider.authHeader);
    const board = await request(testApp)
      .get(PICKUP_BOARD_PATH)
      .query({ hubId: hub.id })
      .set("Authorization", staff.authHeader);

    expect(wasted.body.code).toBe("VISIT_HAS_COLLECTIONS");
    expect(finished.body.data.status).toBe(RiderTaskStatus.COMPLETED);
    expect(board.body.data.items[0]?.pickups).toEqual([
      expect.objectContaining({ fulfilmentGroupId: groups[1]?.id }),
    ]);
  });
});
