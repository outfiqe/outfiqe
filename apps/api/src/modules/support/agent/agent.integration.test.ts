import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { UserRole } from "#generated/prisma/enums.js";
import { createRoleLimitedStaffSession } from "#test/integration/auth-helpers.js";
import {
  authHeaderFor,
  createUser,
  openTicket,
  seedPlatform,
  seedSupportStaff,
} from "#test/integration/support-fixtures.js";
import { testApp } from "#test/integration/test-app.js";

let publishSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  publishSpy = vi.spyOn(eventBus, "publish").mockResolvedValue(undefined);
});

afterEach(() => {
  publishSpy.mockRestore();
});

describe("GET /api/support/admin/tickets", () => {
  it("lists requests for platform staff, filterable by status", async () => {
    const requester = await createUser();
    const staff = await seedSupportStaff();
    const ticketId = await openTicket(authHeaderFor(requester.id));

    const unfiltered = await request(testApp)
      .get("/api/support/admin/tickets")
      .set("Authorization", authHeaderFor(staff.id, UserRole.ADMIN));
    expect(unfiltered.status).toBe(200);
    expect(unfiltered.body.data.tickets.map((ticket: { id: string }) => ticket.id)).toContain(
      ticketId,
    );

    const filtered = await request(testApp)
      .get("/api/support/admin/tickets?status=RESOLVED")
      .set("Authorization", authHeaderFor(staff.id, UserRole.ADMIN));
    expect(filtered.status).toBe(200);
    expect(filtered.body.data.tickets.map((ticket: { id: string }) => ticket.id)).not.toContain(
      ticketId,
    );
  });

  it("rejects a non-platform admin", async () => {
    const outsider = await createUser(UserRole.ADMIN);

    const response = await request(testApp)
      .get("/api/support/admin/tickets")
      .set("Authorization", authHeaderFor(outsider.id, UserRole.ADMIN));

    expect(response.status).toBe(403);
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
      .send({ assigneeUserId: staff.id, expectedAssigneeUserId: null });
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
      .send({ assigneeUserId: agent.id, expectedAssigneeUserId: null });

    expect(response.status).toBe(200);
    expect(publishSpy).toHaveBeenCalledWith(
      DomainEvents.SUPPORT_TICKET_ASSIGNED,
      expect.objectContaining({ ticketId, assigneeUserId: agent.id }),
    );
  });

  it("rejects an assign request whose expected assignee is stale", async () => {
    const requester = await createUser();
    const { addStaff } = await seedPlatform();
    const lead = await addStaff();
    const agent = await addStaff();
    const ticketId = await openTicket(authHeaderFor(requester.id));

    const staleAssign = await request(testApp)
      .patch(`/api/support/admin/tickets/${ticketId}/assignee`)
      .set("Authorization", authHeaderFor(lead.id, UserRole.ADMIN))
      .send({ assigneeUserId: agent.id, expectedAssigneeUserId: agent.id });

    expect(staleAssign.status).toBe(409);
    expect(staleAssign.body.code).toBe("SUPPORT_ASSIGNEE_CHANGED");

    const ticket = await prisma.supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
    expect(ticket.assigneeUserId).toBeNull();
  });
});

describe("admin ticket detail, priority, stats and agents", () => {
  it("returns a single ticket for platform staff", async () => {
    const requester = await createUser();
    const staff = await seedSupportStaff();
    const ticketId = await openTicket(authHeaderFor(requester.id));

    const response = await request(testApp)
      .get(`/api/support/admin/tickets/${ticketId}`)
      .set("Authorization", authHeaderFor(staff.id, UserRole.ADMIN));

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(ticketId);
  });

  it("updates a ticket's priority", async () => {
    const requester = await createUser();
    const staff = await seedSupportStaff();
    const ticketId = await openTicket(authHeaderFor(requester.id));

    const response = await request(testApp)
      .patch(`/api/support/admin/tickets/${ticketId}/priority`)
      .set("Authorization", authHeaderFor(staff.id, UserRole.ADMIN))
      .send({ priority: "HIGH", expectedPriority: "NORMAL" });

    expect(response.status).toBe(200);
    expect(response.body.data.priority).toBe("HIGH");
  });

  it("rejects a priority change whose expected priority is stale", async () => {
    const requester = await createUser();
    const staff = await seedSupportStaff();
    const ticketId = await openTicket(authHeaderFor(requester.id));

    const staleChange = await request(testApp)
      .patch(`/api/support/admin/tickets/${ticketId}/priority`)
      .set("Authorization", authHeaderFor(staff.id, UserRole.ADMIN))
      .send({ priority: "HIGH", expectedPriority: "LOW" });

    expect(staleChange.status).toBe(409);
    expect(staleChange.body.code).toBe("SUPPORT_PRIORITY_CHANGED");

    const ticket = await prisma.supportTicket.findUniqueOrThrow({ where: { id: ticketId } });
    expect(ticket.priority).toBe("NORMAL");
  });

  it("returns inbox stats", async () => {
    const requester = await createUser();
    const staff = await seedSupportStaff();
    await openTicket(authHeaderFor(requester.id));

    const response = await request(testApp)
      .get("/api/support/admin/stats")
      .set("Authorization", authHeaderFor(staff.id, UserRole.ADMIN));

    expect(response.status).toBe(200);
    expect(response.body.data.open).toBeGreaterThanOrEqual(1);
  });

  it("lists only staff who can respond to or manage requests as agents", async () => {
    const respondingAgent = await createRoleLimitedStaffSession("platform:support:respond");
    const readOnlyStaff = await createRoleLimitedStaffSession("platform:support:read");
    const financeStaff = await createRoleLimitedStaffSession("platform:finance:read");

    const response = await request(testApp)
      .get("/api/support/admin/agents")
      .set("Authorization", respondingAgent.authHeader);

    expect(response.status).toBe(200);
    const agentIds = response.body.data.map((agent: { userId: string }) => agent.userId);
    expect(agentIds).toContain(respondingAgent.userId);
    expect(agentIds).not.toContain(readOnlyStaff.userId);
    expect(agentIds).not.toContain(financeStaff.userId);
  });

  it("lists support agents", async () => {
    const staff = await seedSupportStaff();

    const response = await request(testApp)
      .get("/api/support/admin/agents")
      .set("Authorization", authHeaderFor(staff.id, UserRole.ADMIN));

    expect(response.status).toBe(200);
    expect(response.body.data.map((agent: { userId: string }) => agent.userId)).toContain(staff.id);
  });
});
