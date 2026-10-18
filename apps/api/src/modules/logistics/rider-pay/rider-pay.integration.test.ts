import { addDays } from "date-fns/addDays";
import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  LedgerEntryKind,
  RiderEarningKind,
  RiderEarningStatus,
  RiderEmploymentType,
  WithdrawOwnerType,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import {
  createAdminSessionWithPlatformPermissions,
  createRoleLimitedStaffSession,
} from "#test/integration/auth-helpers.js";
import {
  collectBags,
  finishRiderVisit,
  markRiderVisitWasted,
  setUpRiderVisit,
} from "#test/integration/rider-pay-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import {
  createOpenPolicy,
  createVerifiedBankAccount,
} from "#test/integration/withdraw-fixtures.js";

import { logisticsRiderPayService } from "./rider-pay.service.js";

const RATES_PATH = "/api/logistics/admin/rider-pay-rates";
const ADMIN_EARNINGS_PATH = "/api/logistics/admin/rider-earnings";
const MY_EARNINGS_PATH = "/api/logistics/rider/earnings";
const THREE_BAGS = 3;
const TWO_BAGS = 2;
const ONE_BAG = 1;
const DEFAULT_VISIT_PAY = 70;
const DEFAULT_EXTRA_STOP_PAY = 15;
const DEFAULT_WASTED_VISIT_PAY = 35;
const NEW_VISIT_PAY = 90;
const NEW_EXTRA_STOP_PAY = 20;
const NEW_WASTED_VISIT_PAY = 40;
const HOLDING_PERIOD_DAYS = 7;
const DAYS_PAST_HOLDING_PERIOD = 8;
const SMALL_WITHDRAW_MINIMUM = 50;

const findEarningForTask = (riderTaskId: string) =>
  prisma.riderEarning.findUnique({ where: { riderTaskId } });

const releaseEarningNow = async (earningId: string) => {
  await prisma.riderEarning.update({
    where: { id: earningId },
    data: { releasesAt: subDays(new Date(), DAYS_PAST_HOLDING_PERIOD) },
  });
  await logisticsRiderPayService.releaseDueRiderEarnings();
};

beforeEach(async () => {
  await redis.flushdb();
  await prisma.riderPayRate.deleteMany({});
});

describe("rider pay for visits", () => {
  it("pays a contractor the visit rate plus each extra bag, held for the payout period", async () => {
    const visit = await setUpRiderVisit({ pickupCount: THREE_BAGS });

    await collectBags(visit, THREE_BAGS);

    const earning = await findEarningForTask(visit.taskId);
    expect(earning).toMatchObject({
      kind: RiderEarningKind.VISIT,
      stopCount: THREE_BAGS,
      amount: DEFAULT_VISIT_PAY + DEFAULT_EXTRA_STOP_PAY * (THREE_BAGS - ONE_BAG),
      status: RiderEarningStatus.PENDING,
      payRateId: null,
      currency: "NPR",
    });
    expect(earning?.releasesAt.getTime()).toBe(
      addDays(earning?.earnedAt ?? new Date(), HOLDING_PERIOD_DAYS).getTime(),
    );
  });

  it("pays only the bags collected when a visit is finished early", async () => {
    const visit = await setUpRiderVisit({ pickupCount: THREE_BAGS });
    await collectBags(visit, TWO_BAGS);

    const finished = await finishRiderVisit(visit.rider.authHeader, visit.taskId);

    expect(finished.status).toBe(HTTP_STATUS.OK);
    expect(await findEarningForTask(visit.taskId)).toMatchObject({
      stopCount: TWO_BAGS,
      amount: DEFAULT_VISIT_PAY + DEFAULT_EXTRA_STOP_PAY,
    });
  });

  it("pays the wasted-visit rate and nothing to employees", async () => {
    const contractorVisit = await setUpRiderVisit({ pickupCount: ONE_BAG });
    const employeeVisit = await setUpRiderVisit({
      pickupCount: ONE_BAG,
      employmentType: RiderEmploymentType.EMPLOYEE,
    });

    await markRiderVisitWasted(contractorVisit.rider.authHeader, contractorVisit.taskId);
    await collectBags(employeeVisit, ONE_BAG);

    expect(await findEarningForTask(contractorVisit.taskId)).toMatchObject({
      kind: RiderEarningKind.WASTED_VISIT,
      stopCount: 0,
      amount: DEFAULT_WASTED_VISIT_PAY,
    });
    expect(await findEarningForTask(employeeVisit.taskId)).toBeNull();
  });

  it("uses a new rate for later visits and keeps earlier earnings as they were", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const earlierVisit = await setUpRiderVisit({ pickupCount: ONE_BAG });
    await collectBags(earlierVisit, ONE_BAG);

    const pastStart = await request(testApp)
      .post(RATES_PATH)
      .set("Authorization", staff.authHeader)
      .send({
        countryCode: "NP",
        visitAmount: NEW_VISIT_PAY,
        extraStopAmount: NEW_EXTRA_STOP_PAY,
        wastedVisitAmount: NEW_WASTED_VISIT_PAY,
        effectiveFrom: subDays(new Date(), ONE_BAG).toISOString(),
      });
    const created = await request(testApp)
      .post(RATES_PATH)
      .set("Authorization", staff.authHeader)
      .send({
        countryCode: "np",
        visitAmount: NEW_VISIT_PAY,
        extraStopAmount: NEW_EXTRA_STOP_PAY,
        wastedVisitAmount: NEW_WASTED_VISIT_PAY,
      });
    const laterVisit = await setUpRiderVisit({ pickupCount: TWO_BAGS });
    await collectBags(laterVisit, TWO_BAGS);
    const rates = await request(testApp)
      .get(RATES_PATH)
      .query({ countryCode: "NP" })
      .set("Authorization", staff.authHeader);

    expect(pastStart.status).toBe(HTTP_STATUS.UNPROCESSABLE_ENTITY);
    expect(created.status).toBe(HTTP_STATUS.CREATED);
    expect(rates.body.data).toMatchObject({
      currency: "NPR",
      rateInEffect: { visitAmount: NEW_VISIT_PAY, isDefault: false },
      rates: [expect.objectContaining({ id: created.body.data.id, isActive: true })],
    });
    expect((await findEarningForTask(earlierVisit.taskId))?.amount).toBe(DEFAULT_VISIT_PAY);
    expect(await findEarningForTask(laterVisit.taskId)).toMatchObject({
      amount: NEW_VISIT_PAY + NEW_EXTRA_STOP_PAY,
      payRateId: created.body.data.id,
    });

    const switchedOff = await request(testApp)
      .post(`${RATES_PATH}/${created.body.data.id}/deactivate`)
      .set("Authorization", staff.authHeader);
    const switchedOffAgain = await request(testApp)
      .post(`${RATES_PATH}/${created.body.data.id}/deactivate`)
      .set("Authorization", staff.authHeader);
    expect(switchedOff.body.data.isActive).toBe(false);
    expect(switchedOffAgain.status).toBe(HTTP_STATUS.CONFLICT);
  });
});

describe("rider earnings and withdrawals", () => {
  it("releases an earning after the holding period and pays it out through a withdrawal", async () => {
    const visit = await setUpRiderVisit({ pickupCount: ONE_BAG });
    await collectBags(visit, ONE_BAG);
    const earning = await findEarningForTask(visit.taskId);
    if (!earning) throw new Error("The visit didn't earn anything");

    await logisticsRiderPayService.releaseDueRiderEarnings();
    expect((await findEarningForTask(visit.taskId))?.status).toBe(RiderEarningStatus.PENDING);
    await releaseEarningNow(earning.id);

    const myEarnings = await request(testApp)
      .get(MY_EARNINGS_PATH)
      .set("Authorization", visit.rider.authHeader);
    expect(myEarnings.body.data.summary).toEqual({
      currency: "NPR",
      pendingAmount: 0,
      availableAmount: DEFAULT_VISIT_PAY,
      withdrawnAmount: 0,
    });
    expect(myEarnings.body.data.items).toEqual([
      expect.objectContaining({ id: earning.id, status: RiderEarningStatus.AVAILABLE }),
    ]);

    await createOpenPolicy(WithdrawOwnerType.CREATOR, { minAmount: SMALL_WITHDRAW_MINIMUM });
    const bankAccount = await createVerifiedBankAccount(visit.rider.userId);
    const eligibility = await request(testApp)
      .get("/api/withdraw/eligibility")
      .query({ ownerType: WithdrawOwnerType.CREATOR })
      .set("Authorization", visit.rider.authHeader);
    expect(eligibility.body.data.availableBalance).toBe(DEFAULT_VISIT_PAY);

    const withdrawRequest = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", visit.rider.authHeader)
      .send({
        ownerType: WithdrawOwnerType.CREATOR,
        bankAccountId: bankAccount.id,
        amount: DEFAULT_VISIT_PAY,
      });
    expect(withdrawRequest.status).toBe(HTTP_STATUS.CREATED);
    const withdrawAdmin = await createAdminSessionWithPlatformPermissions(
      "platform:withdraw:manage",
    );
    const requestId: string = withdrawRequest.body.data.id;
    await request(testApp)
      .patch(`/api/withdraw/admin/requests/${requestId}/approve`)
      .set("Authorization", withdrawAdmin.authHeader)
      .send({ identityCrossCheckConfirmed: true });
    const paid = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${requestId}/mark-paid`)
      .set("Authorization", withdrawAdmin.authHeader)
      .send({ referenceNote: "RIDER-TXN-1" });

    expect(paid.status).toBe(HTTP_STATUS.OK);
    expect((await findEarningForTask(visit.taskId))?.status).toBe(RiderEarningStatus.WITHDRAWN);
    expect(
      await prisma.withdrawRequestLedgerEntry.findMany({ where: { withdrawRequestId: requestId } }),
    ).toEqual([
      expect.objectContaining({
        entryKind: LedgerEntryKind.RIDER_EARNING,
        riderEarningId: earning.id,
      }),
    ]);
  });

  it("lets staff void a wrong earning, but not one already paid out", async () => {
    const staff = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const visit = await setUpRiderVisit({ pickupCount: ONE_BAG });
    await markRiderVisitWasted(visit.rider.authHeader, visit.taskId);
    const earning = await findEarningForTask(visit.taskId);
    if (!earning) throw new Error("The visit didn't earn anything");

    const listed = await request(testApp)
      .get(ADMIN_EARNINGS_PATH)
      .query({ riderId: visit.rider.riderId })
      .set("Authorization", staff.authHeader);
    const voided = await request(testApp)
      .post(`${ADMIN_EARNINGS_PATH}/${earning.id}/void`)
      .set("Authorization", staff.authHeader)
      .send({ reason: "Shop was open, rider skipped it" });
    const voidedAgain = await request(testApp)
      .post(`${ADMIN_EARNINGS_PATH}/${earning.id}/void`)
      .set("Authorization", staff.authHeader)
      .send({ reason: "Shop was open, rider skipped it" });

    expect(listed.body.data.items).toEqual([
      expect.objectContaining({ id: earning.id, riderName: "Test Rider" }),
    ]);
    expect(voided.body.data.status).toBe(RiderEarningStatus.VOIDED);
    expect(voidedAgain.status).toBe(HTTP_STATUS.CONFLICT);
  });

  it("keeps rider earnings out of reach of other accounts", async () => {
    const visit = await setUpRiderVisit({ pickupCount: ONE_BAG });
    const readOnlyStaff = await createRoleLimitedStaffSession("platform:logistics:read");

    const staffOnRiderPath = await request(testApp)
      .get(MY_EARNINGS_PATH)
      .set("Authorization", readOnlyStaff.authHeader);
    const riderOnAdminPath = await request(testApp)
      .get(ADMIN_EARNINGS_PATH)
      .set("Authorization", visit.rider.authHeader);
    const readOnlySetsRate = await request(testApp)
      .post(RATES_PATH)
      .set("Authorization", readOnlyStaff.authHeader)
      .send({ countryCode: "NP", visitAmount: 1, extraStopAmount: 1, wastedVisitAmount: 1 });

    expect(staffOnRiderPath.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(riderOnAdminPath.status).toBe(HTTP_STATUS.FORBIDDEN);
    expect(readOnlySetsRate.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});
