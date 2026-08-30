import { mswServer } from "@test/integration/msw/server";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { crmActivitiesApi } from "./activitiesApi";
import { crmBillingApi } from "./billingApi";
import { crmPipelineApi } from "./pipelineApi";
import { crmRelationshipsApi } from "./relationshipsApi";
import { crmTicketsApi } from "./ticketsApi";

const API_BASE = "http://localhost:3000/api";

const ok = (data: unknown, status = 200) => HttpResponse.json({ success: true, data }, { status });

const stage = {
  id: "s1",
  organizationId: "o1",
  name: "Lead",
  sortOrder: 0,
  isWon: false,
  isLost: false,
};

const deal = {
  id: "d1",
  organizationId: "o1",
  stageId: "s1",
  stageName: "Lead",
  title: "Spring collab",
  value: 4000,
  currency: "NPR",
  expectedCloseDate: null,
  ownerMembershipId: null,
  ownerName: null,
  partnerCreatorId: "u1",
  partnerName: "Aasha",
  partnerHandle: "aasha",
  status: "OPEN" as const,
  closedAt: null,
  createdAt: "2026-08-20T00:00:00.000Z",
};

const ticket = {
  id: "t1",
  organizationId: "o1",
  type: "COMPLAINT" as const,
  status: "OPEN" as const,
  title: "Damaged",
  description: "torn",
  partnerCreatorId: null,
  customerUserId: "c1",
  assigneeMembershipId: null,
  assigneeName: null,
  createdByMembershipId: "m1",
  resolvedAt: null,
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
};

const task = {
  id: "tk1",
  organizationId: "o1",
  title: "Follow up",
  description: null,
  dueAt: "2026-08-25T00:00:00.000Z",
  status: "OPEN" as const,
  assigneeMembershipId: "m1",
  assigneeName: "Bipin",
  createdByMembershipId: "m1",
  partnerCreatorId: null,
  customerUserId: null,
  dealId: null,
  completedAt: null,
  createdAt: "2026-08-20T00:00:00.000Z",
};

const partnerSummary = {
  creatorId: "u1",
  name: "Aasha",
  handle: "aasha",
  avatarUrl: null,
  tagClickCount: 3,
  attributedOrderCount: 1,
  attributedRevenue: 4500,
  lastActivityAt: null,
};

const customerSummary = {
  userId: "c1",
  name: "Sita",
  handle: "sita",
  avatarUrl: null,
  orderCount: 2,
  itemCount: 3,
  totalPaid: 12000,
  firstOrderAt: null,
  lastOrderAt: null,
};

describe("crmPipelineApi", () => {
  it("covers every stage and deal method", async () => {
    let seenStageBody: unknown;
    let seenReorder: unknown;
    let seenDealBody: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/pipeline/stages`, () => ok([stage])),
      http.post(`${API_BASE}/crm/pipeline/stages`, async ({ request }) => {
        seenStageBody = await request.json();
        return ok(stage, 201);
      }),
      http.patch(`${API_BASE}/crm/pipeline/stages/s1`, () => ok({ ...stage, name: "Qualified" })),
      http.delete(`${API_BASE}/crm/pipeline/stages/s1`, () => ok(null)),
      http.post(`${API_BASE}/crm/pipeline/stages/reorder`, async ({ request }) => {
        seenReorder = await request.json();
        return ok(null);
      }),
      http.get(`${API_BASE}/crm/deals`, () => ok([deal])),
      http.post(`${API_BASE}/crm/deals`, async ({ request }) => {
        seenDealBody = await request.json();
        return ok(deal, 201);
      }),
      http.patch(`${API_BASE}/crm/deals/d1`, () => ok({ ...deal, status: "WON" })),
      http.delete(`${API_BASE}/crm/deals/d1`, () => ok(null)),
    );

    expect(await crmPipelineApi.listStages()).toHaveLength(1);
    await crmPipelineApi.createStage({ name: "New", isWon: false, isLost: false });
    expect(seenStageBody).toEqual({ name: "New", isWon: false, isLost: false });
    expect((await crmPipelineApi.updateStage("s1", { name: "Qualified" })).name).toBe("Qualified");
    await crmPipelineApi.deleteStage("s1");
    await crmPipelineApi.reorderStages(["s1", "s2"]);
    expect(seenReorder).toEqual({ orderedStageIds: ["s1", "s2"] });

    expect(await crmPipelineApi.listDeals()).toHaveLength(1);
    await crmPipelineApi.createDeal({ stageId: "s1", title: "T", partnerCreatorId: "u1" });
    expect(seenDealBody).toMatchObject({ stageId: "s1", title: "T" });
    expect((await crmPipelineApi.updateDeal("d1", { stageId: "s2" })).status).toBe("WON");
    await crmPipelineApi.deleteDeal("d1");
  });
});

describe("crmTicketsApi", () => {
  it("covers every ticket method", async () => {
    let seenStatus: unknown;
    let seenAssignee: unknown;
    let seenComment: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/tickets`, () => ok([ticket])),
      http.get(`${API_BASE}/crm/tickets/t1`, () => ok({ ...ticket, comments: [] })),
      http.post(`${API_BASE}/crm/tickets`, () => ok(ticket, 201)),
      http.patch(`${API_BASE}/crm/tickets/t1/status`, async ({ request }) => {
        seenStatus = await request.json();
        return ok({ ...ticket, status: "IN_PROGRESS", comments: [] });
      }),
      http.patch(`${API_BASE}/crm/tickets/t1/assignee`, async ({ request }) => {
        seenAssignee = await request.json();
        return ok({ ...ticket, assigneeMembershipId: "m2" });
      }),
      http.post(`${API_BASE}/crm/tickets/t1/comments`, async ({ request }) => {
        seenComment = await request.json();
        return ok(null, 201);
      }),
    );

    expect(await crmTicketsApi.listTickets({ status: "OPEN" })).toHaveLength(1);
    expect((await crmTicketsApi.getTicket("t1")).comments).toEqual([]);
    await crmTicketsApi.createTicket({
      type: "COMPLAINT",
      title: "x",
      description: "y",
      subjectType: "customer",
      subjectId: "c1",
    });
    expect((await crmTicketsApi.changeStatus("t1", "IN_PROGRESS")).status).toBe("IN_PROGRESS");
    expect(seenStatus).toEqual({ status: "IN_PROGRESS" });
    expect((await crmTicketsApi.assign("t1", "m2")).assigneeMembershipId).toBe("m2");
    expect(seenAssignee).toEqual({ assigneeMembershipId: "m2" });
    await crmTicketsApi.addComment("t1", "hello");
    expect(seenComment).toEqual({ body: "hello" });
  });
});

describe("crmBillingApi", () => {
  it("covers every billing method", async () => {
    const overview = {
      subscription: null,
      advancedFeaturesEnabled: true,
      planCatalog: [
        {
          id: "starter",
          name: "Starter",
          pricePerSeatPerMonth: 900,
          minSeats: 1,
          maxSeats: 10,
          unlocksAdvancedFeatures: true,
        },
      ],
      activeSeatCount: 2,
    };
    mswServer.use(
      http.get(`${API_BASE}/crm/billing`, () => ok(overview)),
      http.get(`${API_BASE}/crm/billing/invoices`, () => ok({ invoices: [], nextCursor: null })),
      http.post(`${API_BASE}/crm/billing/checkout`, () =>
        ok({ mode: "REDIRECT", redirectUrl: "https://pay", invoiceId: "i1" }),
      ),
      http.post(`${API_BASE}/crm/billing/invoices/i1/pay`, () =>
        ok({ mode: "FORM_POST", formUrl: "https://pay", fields: { a: "b" }, invoiceId: "i1" }),
      ),
      http.post(`${API_BASE}/crm/billing/invoices/i1/verify`, () => ok({ status: "COMPLETE" })),
      http.post(`${API_BASE}/crm/billing/cancel`, () => ok(null)),
    );

    expect((await crmBillingApi.getOverview()).activeSeatCount).toBe(2);
    expect((await crmBillingApi.listInvoices("cur")).invoices).toEqual([]);
    expect(
      (await crmBillingApi.checkout({ plan: "starter", seats: 2, provider: "ESEWA" })).mode,
    ).toBe("REDIRECT");
    expect((await crmBillingApi.payInvoice("i1", "KHALTI")).mode).toBe("FORM_POST");
    expect((await crmBillingApi.verifyInvoice("i1")).status).toBe("COMPLETE");
    await crmBillingApi.cancel();
  });
});

describe("crmActivitiesApi", () => {
  it("covers timeline, activities and task methods", async () => {
    let seenActivity: unknown;
    let seenTask: unknown;
    mswServer.use(
      http.get(`${API_BASE}/crm/timeline`, () =>
        ok({
          entries: [
            {
              kind: "activity",
              id: "a1",
              at: "2026-08-20T00:00:00.000Z",
              activityType: "NOTE",
              body: "hi",
              authorName: "Bipin",
            },
          ],
          partial: false,
        }),
      ),
      http.post(`${API_BASE}/crm/activities`, async ({ request }) => {
        seenActivity = await request.json();
        return ok(null, 201);
      }),
      http.get(`${API_BASE}/crm/tasks`, () => ok([task])),
      http.post(`${API_BASE}/crm/tasks`, async ({ request }) => {
        seenTask = await request.json();
        return ok(task, 201);
      }),
      http.patch(`${API_BASE}/crm/tasks/tk1`, () => ok({ ...task, status: "DONE" })),
      http.delete(`${API_BASE}/crm/tasks/tk1`, () => ok(null)),
    );

    const subject = { subjectType: "partner" as const, subjectId: "u1" };
    expect((await crmActivitiesApi.getTimeline(subject)).partial).toBe(false);
    await crmActivitiesApi.logActivity(subject, { type: "NOTE", body: "note" });
    expect(seenActivity).toMatchObject({ subjectType: "partner", body: "note" });
    expect(await crmActivitiesApi.listTasks()).toHaveLength(1);
    await crmActivitiesApi.createTask({ title: "T", assigneeMembershipId: "m1" });
    expect(seenTask).toMatchObject({ title: "T" });
    expect((await crmActivitiesApi.updateTask("tk1", { status: "DONE" })).status).toBe("DONE");
    await crmActivitiesApi.deleteTask("tk1");
  });
});

describe("crmRelationshipsApi", () => {
  it("covers partner and customer list + detail methods", async () => {
    mswServer.use(
      http.get(`${API_BASE}/crm/partners`, () =>
        ok({ items: [partnerSummary], total: 1, hasMore: false, reason: null }),
      ),
      http.get(`${API_BASE}/crm/partners/u1`, () =>
        ok({ ...partnerSummary, productBreakdown: [], recentAttributedOrders: [] }),
      ),
      http.get(`${API_BASE}/crm/customers`, () =>
        ok({ items: [customerSummary], total: 1, hasMore: false, reason: null }),
      ),
      http.get(`${API_BASE}/crm/customers/c1`, () => ok({ ...customerSummary, recentOrders: [] })),
    );

    expect((await crmRelationshipsApi.listPartners({ q: "a", page: 1, pageSize: 25 })).total).toBe(
      1,
    );
    expect((await crmRelationshipsApi.getPartner("u1")).creatorId).toBe("u1");
    expect((await crmRelationshipsApi.listCustomers()).items).toHaveLength(1);
    expect((await crmRelationshipsApi.getCustomer("c1")).userId).toBe("c1");
  });
});
