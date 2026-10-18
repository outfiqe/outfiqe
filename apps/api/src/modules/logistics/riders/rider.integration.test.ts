import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import { subDays } from "date-fns/subDays";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  IdentityDocumentType,
  RiderEmploymentType,
  RiderStatus,
  RiderStopDirection,
  RiderTaskStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { redis } from "#redis/redis.client.js";
import { DEFAULT_TEST_PASSWORD } from "#test/integration/auth-fixtures.js";
import {
  createAdminSessionWithPlatformPermissions,
  createRoleLimitedStaffSession,
} from "#test/integration/auth-helpers.js";
import {
  createHub,
  createReadyPickupsAtLocation,
  createRiderSession,
} from "#test/integration/logistics-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock("#lib/email.utils.js", () => ({ sendEmail: sendEmailMock }));

const RIDERS_PATH = "/api/logistics/admin/riders";
const INVITES_PATH = `${RIDERS_PATH}/invites`;
const REGISTER_RIDER_PATH = "/api/auth/register/rider";
const RIDER_INVITE_INFO_PATH = "/api/auth/invite/rider";
const INVITE_TTL_DAYS = 7;
const ONE_PICKUP = 1;
const NO_REFRESH_TOKENS = 0;
const NO_ACTIVE_STOPS = 0;

const createRiderInvite = async (
  hubId: string,
  invitedById: string,
  overrides: { employmentType?: RiderEmploymentType; expiresAt?: Date } = {},
) => {
  const rawToken = generateOpaqueToken();
  const invite = await prisma.riderInvite.create({
    data: {
      email: `rider-invite-${rawToken.slice(0, 8).toLowerCase()}@outfiqe.test`,
      name: "New Rider",
      hubId,
      employmentType: overrides.employmentType ?? RiderEmploymentType.CONTRACTOR,
      tokenHash: hashToken(rawToken),
      expiresAt: overrides.expiresAt ?? addDays(new Date(), INVITE_TTL_DAYS),
      invitedById,
    },
  });
  return { rawToken, invite };
};

const registerBody = (inviteToken: string) => ({
  inviteToken,
  phone: uniquePhone(),
  password: DEFAULT_TEST_PASSWORD,
  confirmPassword: DEFAULT_TEST_PASSWORD,
});

beforeEach(async () => {
  await redis.flushdb();
  sendEmailMock.mockReset();
});

describe("inviting riders", () => {
  it("stores a hashed invite and emails the rider a sign-up link", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );
    const hub = await createHub();

    const response = await request(testApp)
      .post(INVITES_PATH)
      .set("Authorization", authHeader)
      .send({
        email: "New.Rider@Outfiqe.test",
        name: "Asha Rider",
        hubId: hub.id,
        employmentType: RiderEmploymentType.CONTRACTOR,
      });

    expect(response.status).toBe(201);
    const invite = await prisma.riderInvite.findFirstOrThrow({
      where: { email: "new.rider@outfiqe.test" },
    });
    expect(invite.hubId).toBe(hub.id);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "new.rider@outfiqe.test" }),
    );
    const [{ body }] = sendEmailMock.mock.calls[0] ?? [{ body: "" }];
    expect(body).toContain("/register/rider?token=");
  });

  it("refuses a second pending invite for the same email", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );
    const hub = await createHub();
    const inviteBody = {
      email: "twice@outfiqe.test",
      name: "Twice",
      hubId: hub.id,
      employmentType: RiderEmploymentType.EMPLOYEE,
    };

    await request(testApp).post(INVITES_PATH).set("Authorization", authHeader).send(inviteBody);
    const repeated = await request(testApp)
      .post(INVITES_PATH)
      .set("Authorization", authHeader)
      .send(inviteBody);

    expect(repeated.status).toBe(409);
    expect(repeated.body.code).toBe("INVITE_ALREADY_PENDING");
  });

  it("is closed to staff who can only read logistics", async () => {
    const { authHeader } = await createRoleLimitedStaffSession("platform:logistics:read");
    const hub = await createHub();

    const response = await request(testApp)
      .post(INVITES_PATH)
      .set("Authorization", authHeader)
      .send({
        email: "nope@outfiqe.test",
        name: "Nope",
        hubId: hub.id,
        employmentType: RiderEmploymentType.EMPLOYEE,
      });

    expect(response.status).toBe(403);
  });
});

describe("rider registration from an invite", () => {
  it("shows the invite, then creates a rider account waiting for an ID check", async () => {
    const { userId } = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const hub = await createHub();
    const { rawToken, invite } = await createRiderInvite(hub.id, userId);

    const info = await request(testApp).get(RIDER_INVITE_INFO_PATH).query({ token: rawToken });
    expect(info.body.data).toEqual({ email: invite.email, name: "New Rider", hubName: hub.name });

    const response = await request(testApp).post(REGISTER_RIDER_PATH).send(registerBody(rawToken));

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe(UserRole.RIDER);
    const rider = await prisma.rider.findFirstOrThrow({
      where: { user: { email: invite.email } },
    });
    expect(rider.status).toBe(RiderStatus.PENDING_VERIFICATION);
    expect(
      (await prisma.riderInvite.findUniqueOrThrow({ where: { id: invite.id } })).acceptedAt,
    ).not.toBeNull();
  });

  it("starts an employee as active", async () => {
    const { userId } = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const hub = await createHub();
    const { rawToken, invite } = await createRiderInvite(hub.id, userId, {
      employmentType: RiderEmploymentType.EMPLOYEE,
    });

    await request(testApp).post(REGISTER_RIDER_PATH).send(registerBody(rawToken));

    const rider = await prisma.rider.findFirstOrThrow({
      where: { user: { email: invite.email } },
    });
    expect(rider.status).toBe(RiderStatus.ACTIVE);
  });

  it("refuses an expired invite and a reused one", async () => {
    const { userId } = await createAdminSessionWithPlatformPermissions("platform:logistics:manage");
    const hub = await createHub();
    const expired = await createRiderInvite(hub.id, userId, { expiresAt: subDays(new Date(), 1) });
    const used = await createRiderInvite(hub.id, userId);
    await request(testApp).post(REGISTER_RIDER_PATH).send(registerBody(used.rawToken));

    const expiredResponse = await request(testApp)
      .post(REGISTER_RIDER_PATH)
      .send(registerBody(expired.rawToken));
    const reusedResponse = await request(testApp)
      .post(REGISTER_RIDER_PATH)
      .send(registerBody(used.rawToken));

    expect(expiredResponse.body.code).toBe("INVITE_EXPIRED");
    expect(reusedResponse.body.code).toBe("INVITE_USED");
  });
});

describe("managing riders", () => {
  it("records an in-person ID check, then allows activation", async () => {
    const { authHeader } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );
    const hub = await createHub();
    const { riderId } = await createRiderSession({
      hubId: hub.id,
      status: RiderStatus.PENDING_VERIFICATION,
    });

    const blocked = await request(testApp)
      .patch(`${RIDERS_PATH}/${riderId}/status`)
      .set("Authorization", authHeader)
      .send({ status: RiderStatus.ACTIVE });
    expect(blocked.status).toBe(409);
    expect(blocked.body.code).toBe("RIDER_IDENTITY_NOT_CHECKED");

    const checked = await request(testApp)
      .post(`${RIDERS_PATH}/${riderId}/identity-check`)
      .set("Authorization", authHeader)
      .send({ documentType: IdentityDocumentType.CITIZENSHIP, documentLast4: "a1b2" });
    expect(checked.status).toBe(200);
    expect(checked.body.data.identityDocumentLast4).toBe("A1B2");

    const activated = await request(testApp)
      .patch(`${RIDERS_PATH}/${riderId}/status`)
      .set("Authorization", authHeader)
      .send({ status: RiderStatus.ACTIVE });
    expect(activated.status).toBe(200);
    expect(activated.body.data.status).toBe(RiderStatus.ACTIVE);
  });

  it("suspending a rider signs them out and puts their visits back on the board", async () => {
    const { authHeader, userId: staffUserId } = await createAdminSessionWithPlatformPermissions(
      "platform:logistics:manage",
    );
    const hub = await createHub();
    const rider = await createRiderSession({ hubId: hub.id });
    const { brand, pickupLocation, groups } = await createReadyPickupsAtLocation(
      hub.id,
      ONE_PICKUP,
    );
    const task = await prisma.riderTask.create({
      data: {
        riderId: rider.riderId,
        hubId: hub.id,
        brandId: brand.id,
        pickupLocationId: pickupLocation.id,
        roundStartsAt: new Date(),
        assignedById: staffUserId,
        stops: {
          create: groups.map((group) => ({
            fulfilmentGroupId: group.id,
            direction: RiderStopDirection.COLLECT,
          })),
        },
      },
    });
    await prisma.refreshToken.create({
      data: {
        userId: rider.userId,
        tokenHash: hashToken(generateOpaqueToken()),
        familyId: randomUUID(),
        expiresAt: addDays(new Date(), INVITE_TTL_DAYS),
      },
    });

    const response = await request(testApp)
      .patch(`${RIDERS_PATH}/${rider.riderId}/status`)
      .set("Authorization", authHeader)
      .send({ status: RiderStatus.SUSPENDED });

    expect(response.status).toBe(200);
    expect((await prisma.riderTask.findUniqueOrThrow({ where: { id: task.id } })).status).toBe(
      RiderTaskStatus.CANCELLED,
    );
    expect(
      await prisma.riderTaskStop.count({ where: { riderTaskId: task.id, isActive: true } }),
    ).toBe(NO_ACTIVE_STOPS);
    expect(await prisma.refreshToken.count({ where: { userId: rider.userId } })).toBe(
      NO_REFRESH_TOKENS,
    );
  });

  it("lists riders for a hub", async () => {
    const { authHeader } =
      await createAdminSessionWithPlatformPermissions("platform:logistics:read");
    const hub = await createHub();
    const { riderId } = await createRiderSession({ hubId: hub.id });

    const response = await request(testApp)
      .get(RIDERS_PATH)
      .query({ hubId: hub.id })
      .set("Authorization", authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.items).toEqual([
      expect.objectContaining({ id: riderId, hubName: hub.name }),
    ]);
  });
});
