import { randomUUID } from "node:crypto";

import request from "supertest";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { RiderEmploymentType } from "#generated/prisma/enums.js";

import { createAdminSessionWithPlatformPermissions } from "./auth-helpers.js";
import {
  createBagTag,
  createHub,
  createReadyPickupsAtLocation,
  createRiderSession,
  requireFixtureId,
} from "./logistics-fixtures.js";
import { testApp } from "./test-app.js";

const ADMIN_TASKS_PATH = "/api/logistics/admin/rider-tasks";
const RIDER_TASKS_PATH = "/api/logistics/rider/tasks";

export const setUpRiderVisit = async ({
  pickupCount,
  employmentType = RiderEmploymentType.CONTRACTOR,
}: {
  pickupCount: number;
  employmentType?: RiderEmploymentType;
}) => {
  const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
  const hub = await createHub();
  const rider = await createRiderSession({ hubId: hub.id, employmentType });
  const { pickupLocation, groups } = await createReadyPickupsAtLocation(hub.id, pickupCount);
  const assigned = await request(testApp)
    .post(ADMIN_TASKS_PATH)
    .set("Authorization", staff.authHeader)
    .send({
      riderId: rider.riderId,
      pickupLocationId: pickupLocation.id,
      fulfilmentGroupIds: groups.map(({ id }) => id),
      roundStartsAt: new Date().toISOString(),
    });
  const taskId = requireFixtureId(assigned.body.data.id);
  return { staff, hub, rider, groups, taskId };
};

export const collectBags = async (
  visit: Awaited<ReturnType<typeof setUpRiderVisit>>,
  bagCount: number,
) => {
  const { staff, hub, rider, groups, taskId } = visit;
  for (const group of groups.slice(0, bagCount)) {
    const bagTag = await createBagTag(hub.id, staff.userId);
    await request(testApp)
      .post(`${RIDER_TASKS_PATH}/${taskId}/collect-scans`)
      .set("Authorization", rider.authHeader)
      .set(IDEMPOTENCY_HEADER, `scan-${randomUUID()}`)
      .send({
        pickupCode: requireFixtureId(group.pickupCode ?? undefined),
        bagTagCode: bagTag.code,
        scannedAt: new Date().toISOString(),
      });
  }
};

export const finishRiderVisit = (authHeader: string, taskId: string) =>
  request(testApp).post(`${RIDER_TASKS_PATH}/${taskId}/finish`).set("Authorization", authHeader);

export const markRiderVisitWasted = (authHeader: string, taskId: string) =>
  request(testApp)
    .post(`${RIDER_TASKS_PATH}/${taskId}/wasted`)
    .set("Authorization", authHeader)
    .send({ reason: "Shop was closed" });
