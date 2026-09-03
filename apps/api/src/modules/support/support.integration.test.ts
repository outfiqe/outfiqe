import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import {
  PLATFORM_PERMISSION_CATALOG,
  PLATFORM_PERMISSION_KEYS,
} from "#modules/platform-access/platform-access.constants.js";
import { seedPlatformOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const authHeaderFor = (userId: string, role: UserRole = UserRole.CUSTOMER) =>
  `Bearer ${generateTokenpair({ sub: userId, role }).accessToken}`;

const createUser = (role: UserRole = UserRole.CUSTOMER) =>
  prisma.user.create({
    data: {
      email: `sup-${randomUUID()}@outfiqe.test`,
      name: "Support Person",
      handle: `sup-${randomUUID().slice(0, 12)}`,
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const seedPlatform = async () => {
  const { organization, adminRole } = await seedPlatformOrganization();
  await prisma.permission.createMany({
    data: PLATFORM_PERMISSION_CATALOG.map((permission) => ({ ...permission })),
    skipDuplicates: true,
  });
  await prisma.rolePermission.createMany({
    data: PLATFORM_PERMISSION_KEYS.map((permissionKey) => ({
      roleId: adminRole.id,
      permissionKey,
    })),
    skipDuplicates: true,
  });

  const addStaff = async () => {
    const staff = await createUser(UserRole.ADMIN);
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: staff.id,
        roleId: adminRole.id,
        status: "ACTIVE",
      },
    });
    return staff;
  };

  return { organization, addStaff };
};

const seedSupportStaff = async () => (await seedPlatform()).addStaff();

const createBody = (overrides: Record<string, unknown> = {}) => ({
  category: "ORDER_ISSUE",
  subject: "Where is my order?",
  message: "It has been eight days and nothing has arrived yet, please help me here.",
  ...overrides,
});

const openTicket = async (requesterHeader: string) => {
  const response = await request(testApp)
    .post("/api/support/tickets")
    .set("Authorization", requesterHeader)
    .send(createBody());
  return response.body.data.id as string;
};

let publishSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  publishSpy = vi.spyOn(eventBus, "publish").mockResolvedValue(undefined);
});

afterEach(() => {
  publishSpy.mockRestore();
});

describe("POST /api/support/tickets", () => {
  it("requires authentication", async () => {
    const response = await request(testApp).post("/api/support/tickets").send(createBody());
    expect(response.status).toBe(401);
  });

  it("creates a NEW ticket with the first message and publishes the created event", async () => {
    const requester = await createUser();
    const response = await request(testApp)
      .post("/api/support/tickets")
      .set("Authorization", authHeaderFor(requester.id))
      .send(createBody());

    expect(response.status).toBe(201);
    expect(response.body.data.reference).toMatch(/^OFQ-\d+$/);

    const stored = await prisma.supportTicket.findUnique({
      where: { id: response.body.data.id },
      include: { messages: true },
    });
    expect(stored?.status).toBe("NEW");
    expect(stored?.requesterUserId).toBe(requester.id);
    expect(stored?.segment).toBe("SHOPPER");
    expect(stored?.messages).toHaveLength(1);
    expect(stored?.messages[0]?.authorKind).toBe("REQUESTER");

    expect(publishSpy).toHaveBeenCalledWith(
      DomainEvents.SUPPORT_TICKET_CREATED,
      expect.objectContaining({ ticketId: stored?.id }),
    );
  });

  it("rejects a too-short message", async () => {
    const requester = await createUser();
    const response = await request(testApp)
      .post("/api/support/tickets")
      .set("Authorization", authHeaderFor(requester.id))
      .send(createBody({ message: "too short" }));
    expect(response.status).toBe(422);
  });
});

describe("requester access", () => {
  it("only returns the requester's own tickets and hides internal notes", async () => {
    const requester = await createUser();
    const other = await createUser();
    const staff = await seedSupportStaff();
    const ticketId = await openTicket(authHeaderFor(requester.id));

    await request(testApp)
      .post(`/api/support/admin/tickets/${ticketId}/messages`)
      .set("Authorization", authHeaderFor(staff.id, UserRole.ADMIN))
      .send({ body: "internal triage note", visibility: "INTERNAL" });

    const mine = await request(testApp)
      .get(`/api/support/tickets/mine/${ticketId}`)
      .set("Authorization", authHeaderFor(requester.id));
    expect(mine.status).toBe(200);
    expect(
      mine.body.data.messages.every((m: { visibility: string }) => m.visibility === "PUBLIC"),
    ).toBe(true);

    const notMine = await request(testApp)
      .get(`/api/support/tickets/mine/${ticketId}`)
      .set("Authorization", authHeaderFor(other.id));
    expect(notMine.status).toBe(404);
  });
});

describe("admin access control", () => {
  it("rejects a non-platform admin", async () => {
    const requester = await createUser();
    const ticketId = await openTicket(authHeaderFor(requester.id));
    const outsider = await createUser(UserRole.ADMIN);

    const response = await request(testApp)
      .get(`/api/support/admin/tickets/${ticketId}`)
      .set("Authorization", authHeaderFor(outsider.id, UserRole.ADMIN));
    expect(response.status).toBe(403);
  });
});

describe("triage lifecycle", () => {
  it("runs create -> claim -> reply -> resolve -> reopen", async () => {
    const requester = await createUser();
    const staff = await seedSupportStaff();
    const staffHeader = authHeaderFor(staff.id, UserRole.ADMIN);
    const ticketId = await openTicket(authHeaderFor(requester.id));

    const claimed = await request(testApp)
      .patch(`/api/support/admin/tickets/${ticketId}/assignee`)
      .set("Authorization", staffHeader)
      .send({ assigneeUserId: staff.id });
    expect(claimed.status).toBe(200);
    expect(claimed.body.data.status).toBe("OPEN");
    expect(publishSpy).not.toHaveBeenCalledWith(
      DomainEvents.SUPPORT_TICKET_ASSIGNED,
      expect.anything(),
    );

    const replied = await request(testApp)
      .post(`/api/support/admin/tickets/${ticketId}/messages`)
      .set("Authorization", staffHeader)
      .send({ body: "Looking into this now, sorry for the wait.", visibility: "PUBLIC" });
    expect(replied.status).toBe(201);
    expect(replied.body.data.firstRespondedAt).not.toBeNull();
    expect(publishSpy).toHaveBeenCalledWith(
      DomainEvents.SUPPORT_TICKET_STAFF_REPLIED,
      expect.objectContaining({ ticketId }),
    );

    const wrongExpected = await request(testApp)
      .patch(`/api/support/admin/tickets/${ticketId}/status`)
      .set("Authorization", staffHeader)
      .send({ status: "RESOLVED", expectedStatus: "NEW" });
    expect(wrongExpected.status).toBe(409);

    const illegal = await request(testApp)
      .patch(`/api/support/admin/tickets/${ticketId}/status`)
      .set("Authorization", staffHeader)
      .send({ status: "CLOSED", expectedStatus: "OPEN" });
    expect(illegal.status).toBe(409);

    const resolved = await request(testApp)
      .patch(`/api/support/admin/tickets/${ticketId}/status`)
      .set("Authorization", staffHeader)
      .send({ status: "RESOLVED", expectedStatus: "OPEN" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.resolvedAt).not.toBeNull();

    const withToken = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    expect(withToken?.reopenTokenHash).not.toBeNull();

    const requesterReply = await request(testApp)
      .post(`/api/support/tickets/mine/${ticketId}/messages`)
      .set("Authorization", authHeaderFor(requester.id))
      .send({ body: "That still hasn't fixed it for me." });
    expect(requesterReply.status).toBe(201);
    expect(requesterReply.body.data.status).toBe("OPEN");
    expect(publishSpy).toHaveBeenCalledWith(
      DomainEvents.SUPPORT_TICKET_CUSTOMER_REPLIED,
      expect.objectContaining({ ticketId }),
    );
  });

  it("publishes the assigned event when assigning to someone else", async () => {
    const requester = await createUser();
    const { addStaff } = await seedPlatform();
    const lead = await addStaff();
    const agent = await addStaff();
    const ticketId = await openTicket(authHeaderFor(requester.id));

    const response = await request(testApp)
      .patch(`/api/support/admin/tickets/${ticketId}/assignee`)
      .set("Authorization", authHeaderFor(lead.id, UserRole.ADMIN))
      .send({ assigneeUserId: agent.id });

    expect(response.status).toBe(200);
    expect(publishSpy).toHaveBeenCalledWith(
      DomainEvents.SUPPORT_TICKET_ASSIGNED,
      expect.objectContaining({ ticketId, assigneeUserId: agent.id }),
    );
  });
});
