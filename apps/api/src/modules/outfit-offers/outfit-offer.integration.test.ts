import { randomUUID } from "node:crypto";

import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BrandRole,
  CreatorStatus,
  OutfitOfferPayoutStatus,
  OutfitOfferRefundStatus,
  OutfitOfferStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformSettingsService } from "#modules/platform-settings/platform-settings.service.js";
import { OUTBOX_TOPIC } from "#outbox/outbox.constants.js";
import { redis } from "#redis/redis.client.js";
import {
  createAdminSessionWithPlatformPermissions,
  createRoleLimitedStaffSession,
} from "#test/integration/authHelpers.js";
import { UNRELATED_PLATFORM_PERMISSION_KEY } from "#test/integration/crmFixtures.js";
import {
  createOutfitProduct,
  createOutfitUser,
  currentBuildVersion,
  type OutfitTestUser,
  seedOutfitSlotTypes,
  startBuildOrFail,
  turnOutfitBuilderOn,
  writeToBuild,
} from "#test/integration/outfitFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { runOutfitOfferLifecycleSweep } from "./outfit-offer.lifecycle.js";

const khaltiInitiate = vi.hoisted(() => vi.fn());
const khaltiVerify = vi.hoisted(() => vi.fn());
const khaltiRefund = vi.hoisted(() => vi.fn());
const esewaInitiate = vi.hoisted(() => vi.fn());
const esewaVerify = vi.hoisted(() => vi.fn());

vi.mock("#modules/payments/providers/khalti.provider.js", () => ({
  khaltiProvider: { initiate: khaltiInitiate, verify: khaltiVerify, refund: khaltiRefund },
  extractKhaltiTransactionId: (rawResponse: unknown) =>
    typeof rawResponse === "object" && rawResponse !== null && "transaction_id" in rawResponse
      ? String(rawResponse.transaction_id)
      : null,
}));

vi.mock("#modules/payments/providers/esewa.provider.js", () => ({
  esewaProvider: { initiate: esewaInitiate, verify: esewaVerify },
}));

const OK_STATUS = 200;
const CREATED_STATUS = 201;
const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const UNPROCESSABLE_STATUS = 422;
const OFFER_AMOUNT = 5_000;
const LOOK_IMAGE_URL = "https://cdn.outfiqe.test/looks/offer.jpg";

beforeEach(async () => {
  await redis.flushdb();
  platformSettingsService.invalidate();
  await turnOutfitBuilderOn();
  await seedOutfitSlotTypes();
  vi.clearAllMocks();
  khaltiInitiate.mockImplementation(async () => ({
    mode: "REDIRECT" as const,
    redirectUrl: "https://pay.example/khalti",
    providerRef: `pidx-${randomUUID()}`,
  }));
  khaltiVerify.mockResolvedValue({
    status: "COMPLETE",
    rawResponse: { status: "Completed", transaction_id: "khalti-txn-1" },
  });
  khaltiRefund.mockResolvedValue({ succeeded: true, rawResponse: { detail: "refunded" } });
  esewaInitiate.mockImplementation(async () => ({
    mode: "FORM_POST" as const,
    formUrl: "https://pay.example/esewa",
    fields: {},
    providerRef: `esewa-${randomUUID()}`,
  }));
  esewaVerify.mockResolvedValue({ status: "COMPLETE", rawResponse: { status: "COMPLETE" } });
});

const writeAtCurrentVersion = async (
  caller: OutfitTestUser,
  method: "put" | "post",
  outfitId: string,
  path: string,
  body?: Record<string, unknown>,
) => writeToBuild(caller, method, `/${outfitId}${path}`, await currentBuildVersion(outfitId), body);

const createBrandOwner = async () => {
  const brandOwner = await createOutfitUser("Bikash", UserRole.BRAND_OWNER);
  const brand = await prisma.brand.create({
    data: {
      name: `Offer Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Bikash",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  await prisma.brandMembership.create({
    data: { userId: brandOwner.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  return { brandOwner, brandId: brand.id };
};

const createApprovedCreator = async (name: string) => {
  const creator = await createOutfitUser(name);
  await prisma.user.update({
    where: { id: creator.id },
    data: { isCreator: true, creatorStatus: CreatorStatus.APPROVED },
  });
  return creator;
};

const lockedBuildWith = async (owner: OutfitTestUser, editors: OutfitTestUser[]) => {
  const outfitId = await startBuildOrFail(owner);
  await writeAtCurrentVersion(owner, "post", outfitId, "/members", {
    userIds: editors.map(({ id }) => id),
  });
  const shirt = await createOutfitProduct("tops");
  const trousers = await createOutfitProduct("bottoms");
  await writeAtCurrentVersion(owner, "put", outfitId, "/slots/top/positions/0", {
    productId: shirt.id,
  });
  await writeAtCurrentVersion(owner, "put", outfitId, "/slots/bottom/positions/0", {
    productId: trousers.id,
  });
  for (const member of [owner, ...editors]) {
    await writeAtCurrentVersion(member, "put", outfitId, "/happy", { isHappy: true });
  }
  const locked = await writeAtCurrentVersion(owner, "post", outfitId, "/lock");
  expect(locked.status).toBe(OK_STATUS);
  return { outfitId, shirt, trousers };
};

const sendOffer = (
  sender: OutfitTestUser,
  outfitId: string,
  body: Record<string, unknown>,
  idempotencyKey: string = randomUUID(),
) =>
  request(testApp)
    .post(`/api/outfit-offers/builds/${outfitId}`)
    .set("Authorization", sender.auth)
    .set(IDEMPOTENCY_HEADER, idempotencyKey)
    .send(body);

const callOffer = (caller: OutfitTestUser, offerId: string, path: string) =>
  request(testApp).post(`/api/outfit-offers/${offerId}${path}`).set("Authorization", caller.auth);

const paidOffer = async (paymentMethod: "KHALTI" | "ESEWA" = "KHALTI") => {
  const { brandOwner, brandId } = await createBrandOwner();
  const creator = await createApprovedCreator("Sita");
  const build = await lockedBuildWith(brandOwner, [creator]);
  const sent = await sendOffer(brandOwner, build.outfitId, {
    creatorId: creator.id,
    amount: OFFER_AMOUNT,
    paymentMethod,
    note: "Style it your way",
  });
  expect(sent.status).toBe(CREATED_STATUS);
  const offerId: string = sent.body.data.offer.id;
  const verified = await callOffer(brandOwner, offerId, "/payment/verify");
  expect(verified.body.data.isPaid).toBe(true);
  return { brandOwner, brandId, creator, offerId, ...build };
};

const postLookFromBuild = (creator: OutfitTestUser, outfitId: string, productIds: string[]) =>
  request(testApp)
    .post(`/api/outfits/${outfitId}/look`)
    .set("Authorization", creator.auth)
    .send({
      imageUrls: [LOOK_IMAGE_URL],
      caption: "My take",
      sizesWorn: productIds.map((productId) => ({ productId, sizeWorn: "M" })),
    });

const offerRow = (offerId: string) =>
  prisma.outfitOffer.findUniqueOrThrow({ where: { id: offerId } });

describe("sending an offer", () => {
  it("takes the brand's payment, then tells the creator and starts the answer deadline", async () => {
    const { offerId, creator } = await paidOffer();

    const offer = await offerRow(offerId);
    expect(offer.status).toBe(OutfitOfferStatus.AWAITING_RESPONSE);
    expect(offer.acceptBy).not.toBeNull();
    const notice = await prisma.outboxEvent.findFirst({
      where: { topic: OUTBOX_TOPIC.OUTFIT_OFFER_NOTICE, aggregateId: offerId },
    });
    expect(notice?.payload).toMatchObject({
      type: "OUTFIT_OFFER_RECEIVED",
      recipientIds: [creator.id],
    });
    const received = await request(testApp)
      .get("/api/outfit-offers/received")
      .set("Authorization", creator.auth);
    expect(received.body.data.items.map(({ id }: { id: string }) => id)).toEqual([offerId]);
  });

  it("only lets a brand on a locked build offer to an approved creator on it, within the limits, once at a time", async () => {
    const { brandOwner } = await createBrandOwner();
    const creator = await createApprovedCreator("Sita");
    const shopper = await createOutfitUser("Hari");
    const outsiderBrand = await createBrandOwner();
    const { outfitId } = await lockedBuildWith(brandOwner, [creator, shopper]);
    const validBody = { creatorId: creator.id, amount: OFFER_AMOUNT, paymentMethod: "KHALTI" };

    const fromOutsider = await sendOffer(outsiderBrand.brandOwner, outfitId, validBody);
    const toShopper = await sendOffer(brandOwner, outfitId, {
      ...validBody,
      creatorId: shopper.id,
    });
    const tooSmall = await sendOffer(brandOwner, outfitId, { ...validBody, amount: 10 });
    const fromCreator = await sendOffer(creator, outfitId, validBody);
    const first = await sendOffer(brandOwner, outfitId, validBody);
    const second = await sendOffer(brandOwner, outfitId, validBody);

    expect(fromOutsider.status).toBe(NOT_FOUND_STATUS);
    expect(toShopper.status).toBe(UNPROCESSABLE_STATUS);
    expect(tooSmall.status).toBe(UNPROCESSABLE_STATUS);
    expect(fromCreator.status).toBe(FORBIDDEN_STATUS);
    expect(first.status).toBe(CREATED_STATUS);
    expect(second.status).toBe(CONFLICT_STATUS);
    expect(second.body.code).toBe("OFFER_ALREADY_OPEN");
  });
});

describe("answering and posting", () => {
  it("releases the money to the creator once the posted look has stayed up for the hold", async () => {
    const { offerId, creator, outfitId, shirt, trousers } = await paidOffer();

    const accepted = await callOffer(creator, offerId, "/accept");
    const posted = await postLookFromBuild(creator, outfitId, [shirt.id, trousers.id]);
    const afterPosting = await offerRow(offerId);
    await prisma.outfitOffer.update({
      where: { id: offerId },
      data: { releaseAt: subDays(new Date(), 1) },
    });
    await runOutfitOfferLifecycleSweep();
    const afterHold = await offerRow(offerId);

    expect(accepted.status).toBe(OK_STATUS);
    expect(posted.status).toBe(CREATED_STATUS);
    expect(afterPosting.status).toBe(OutfitOfferStatus.POSTED);
    expect(afterPosting.lookId).toBe(posted.body.data.id);
    expect(afterHold.status).toBe(OutfitOfferStatus.RELEASED);
    expect(afterHold.payoutStatus).toBe(OutfitOfferPayoutStatus.AVAILABLE);
    const summary = await request(testApp)
      .get("/api/commissions/me/summary")
      .set("Authorization", creator.auth);
    expect(summary.body.data.available).toBe(OFFER_AMOUNT);
  });

  it("refunds the brand through Khalti when the creator declines", async () => {
    const { offerId, creator, brandOwner } = await paidOffer();

    const declined = await callOffer(creator, offerId, "/decline");
    const offer = await offerRow(offerId);

    expect(declined.status).toBe(OK_STATUS);
    expect(offer.status).toBe(OutfitOfferStatus.DECLINED);
    expect(offer.refundStatus).toBe(OutfitOfferRefundStatus.REFUNDED);
    expect(khaltiRefund).toHaveBeenCalledWith(
      expect.objectContaining({ gatewayTransactionId: "khalti-txn-1" }),
    );
    const sameDeclineAgain = await callOffer(creator, offerId, "/decline");
    expect(sameDeclineAgain.status).toBe(CONFLICT_STATUS);
    const cancelAfterwards = await callOffer(brandOwner, offerId, "/cancel");
    expect(cancelAfterwards.status).toBe(CONFLICT_STATUS);
  });

  it("flags an eSewa refund for a person to make, since eSewa can't refund automatically", async () => {
    const { offerId, brandOwner } = await paidOffer("ESEWA");

    const cancelled = await callOffer(brandOwner, offerId, "/cancel");
    const offer = await offerRow(offerId);

    expect(cancelled.status).toBe(OK_STATUS);
    expect(offer.status).toBe(OutfitOfferStatus.CANCELLED);
    expect(offer.refundStatus).toBe(OutfitOfferRefundStatus.NEEDS_MANUAL_REFUND);
  });
});

describe("the offer sweep", () => {
  it("expires an offer the creator didn't answer in time and refunds the brand", async () => {
    const { offerId } = await paidOffer();
    await prisma.outfitOffer.update({
      where: { id: offerId },
      data: { acceptBy: subDays(new Date(), 1) },
    });

    await runOutfitOfferLifecycleSweep();
    const offer = await offerRow(offerId);

    expect(offer.status).toBe(OutfitOfferStatus.EXPIRED);
    expect(offer.refundStatus).toBe(OutfitOfferRefundStatus.REFUNDED);
  });

  it("refunds the brand when the creator deletes the look before the hold ends", async () => {
    const { offerId, creator, outfitId, shirt, trousers } = await paidOffer();
    await callOffer(creator, offerId, "/accept");
    const posted = await postLookFromBuild(creator, outfitId, [shirt.id, trousers.id]);
    await prisma.creatorLook.update({
      where: { id: posted.body.data.id },
      data: { deletedAt: new Date() },
    });

    await runOutfitOfferLifecycleSweep();
    const offer = await offerRow(offerId);

    expect(offer.status).toBe(OutfitOfferStatus.LOOK_REMOVED);
    expect(offer.refundStatus).toBe(OutfitOfferRefundStatus.REFUNDED);
    expect(offer.payoutStatus).toBe(OutfitOfferPayoutStatus.NONE);
  });
});

describe("admin settling a dispute", () => {
  it("releases an accepted offer to the creator and audits it", async () => {
    const { offerId, creator } = await paidOffer();
    await callOffer(creator, offerId, "/accept");
    const { userId: adminId, authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:commissions:manage",
    );

    const released = await request(testApp)
      .post(`/api/outfit-offers/admin/${offerId}/release`)
      .set("Authorization", authHeader)
      .send({ reason: "Creator posted elsewhere by mistake; brand agreed" });

    expect(released.status).toBe(OK_STATUS);
    expect((await offerRow(offerId)).payoutStatus).toBe(OutfitOfferPayoutStatus.AVAILABLE);
    const auditEntry = await prisma.platformAuditLog.findFirst({
      where: { action: PLATFORM_AUDIT_ACTION.OUTFIT_OFFER_RELEASED_BY_ADMIN, targetId: offerId },
    });
    expect(auditEntry?.actorUserId).toBe(adminId);
  });

  it("records a manual eSewa refund once finance has paid it", async () => {
    const { offerId, brandOwner } = await paidOffer("ESEWA");
    await callOffer(brandOwner, offerId, "/cancel");
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:commissions:manage",
    );

    const marked = await request(testApp)
      .post(`/api/outfit-offers/admin/${offerId}/mark-refunded`)
      .set("Authorization", authHeader)
      .send({ reason: "eSewa transfer ref 123" });

    expect(marked.status).toBe(OK_STATUS);
    expect((await offerRow(offerId)).refundStatus).toBe(OutfitOfferRefundStatus.REFUNDED);
  });

  it("refuses staff without the finance permission", async () => {
    const { offerId } = await paidOffer();
    const { authHeader } = await createRoleLimitedStaffSession(UNRELATED_PLATFORM_PERMISSION_KEY);

    const response = await request(testApp)
      .post(`/api/outfit-offers/admin/${offerId}/refund`)
      .set("Authorization", authHeader)
      .send({ reason: "Trying" });

    expect(response.status).toBe(FORBIDDEN_STATUS);
  });
});
