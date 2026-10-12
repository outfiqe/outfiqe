import { randomUUID } from "node:crypto";

import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prisma } from "#db/prisma.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import {
  authHeaderFor,
  createBody,
  createTicketFixture,
  createUser,
  openTicket,
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

  it("resolves the BRAND segment and attaches the requester's brand", async () => {
    const owner = await createUser(UserRole.BRAND_OWNER);
    const brand = await prisma.brand.create({
      data: {
        name: "Requester Brand",
        contactName: "Owner",
        email: `${randomUUID()}@brand.outfiqe.test`,
        phone: "9800000000",
        instagram: `@${randomUUID().slice(0, 8)}`,
      },
    });
    await prisma.brandMembership.create({ data: { userId: owner.id, brandId: brand.id } });

    const response = await request(testApp)
      .post("/api/support/tickets")
      .set("Authorization", authHeaderFor(owner.id))
      .send(createBody());

    expect(response.status).toBe(201);
    const stored = await prisma.supportTicket.findUniqueOrThrow({
      where: { id: response.body.data.id },
    });
    expect(stored.segment).toBe("BRAND");
    expect(stored.relatedBrandId).toBe(brand.id);
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

  it("lists only the caller's own requests", async () => {
    const requester = await createUser();
    const other = await createUser();
    const ownTicketId = await openTicket(authHeaderFor(requester.id));
    await openTicket(authHeaderFor(other.id));

    const response = await request(testApp)
      .get("/api/support/tickets/mine")
      .set("Authorization", authHeaderFor(requester.id));

    expect(response.status).toBe(200);
    const ids = response.body.data.tickets.map((ticket: { id: string }) => ticket.id);
    expect(ids).toEqual([ownTicketId]);
  });
});

describe("POST /api/support/reopen/:token", () => {
  it("reopens a resolved ticket with a valid token", async () => {
    const rawToken = generateOpaqueToken();
    const ticket = await createTicketFixture({
      status: "RESOLVED",
      resolvedAt: new Date(),
      reopenTokenHash: hashToken(rawToken),
    });

    const response = await request(testApp).post(`/api/support/reopen/${rawToken}`);

    expect(response.status).toBe(200);
    const updated = await prisma.supportTicket.findUniqueOrThrow({ where: { id: ticket.id } });
    expect(updated.status).toBe("OPEN");
    expect(updated.reopenTokenHash).toBeNull();
  });

  it("rejects an unknown token", async () => {
    const response = await request(testApp).post(`/api/support/reopen/${generateOpaqueToken()}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe("SUPPORT_REOPEN_INVALID");
  });

  it("rejects a token for a ticket that isn't in a reopenable status", async () => {
    const rawToken = generateOpaqueToken();
    await createTicketFixture({ status: "OPEN", reopenTokenHash: hashToken(rawToken) });

    const response = await request(testApp).post(`/api/support/reopen/${rawToken}`);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("SUPPORT_REOPEN_INVALID");
  });
});
