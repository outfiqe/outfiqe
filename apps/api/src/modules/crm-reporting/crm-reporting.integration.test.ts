import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import { addHours } from "date-fns/addHours";
import { subHours } from "date-fns/subHours";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { CrmTicketStatus, CrmTicketType, DealStatus, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessRepository } from "#modules/crm-access/crm-access.repository.js";
import { DEFAULT_PIPELINE_STAGES } from "#modules/crm-pipeline/crm-pipeline.constants.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createStaff = (name: string) =>
  prisma.user.create({
    data: {
      email: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: UserRole.ADMIN,
    },
  });

const seedReportingTenant = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Report Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

  const { organization, adminRole } = await seedTenantOrganization({ linkedBrandId: brand.id });
  const owner = await createStaff("Report Owner");
  const ownerMembership = await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: owner.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  await prisma.organization.update({
    where: { id: organization.id },
    data: {
      superAdminMembershipId: ownerMembership.id,
      trialEndsAt: addDays(new Date(), 10),
    },
  });

  await prisma.pipelineStage.createMany({
    data: DEFAULT_PIPELINE_STAGES.map((stage) => ({
      organizationId: organization.id,
      name: stage.name,
      sortOrder: stage.sortOrder,
      isWon: stage.isWon,
      isLost: stage.isLost,
    })),
  });

  const partnerCreator = await createStaff("Deal Partner");
  const stages = await prisma.pipelineStage.findMany({
    where: { organizationId: organization.id },
    orderBy: { sortOrder: "asc" },
  });
  const leadStage = stages.find((stage) => stage.sortOrder === 0);
  const wonStage = stages.find((stage) => stage.isWon);
  const lostStage = stages.find((stage) => stage.isLost);
  if (!leadStage || !wonStage || !lostStage) {
    throw new Error("default pipeline stages were not seeded");
  }

  return { brand, organization, adminRole, owner, partnerCreator, leadStage, wonStage, lostStage };
};

const host = (subdomain: string) => `${subdomain}.localhost`;

describe("GET /api/crm/reports/pipeline", () => {
  it("aggregates deal counts and value by stage, with a zero baseline for empty stages", async () => {
    const { organization, owner, partnerCreator, leadStage, wonStage, lostStage } =
      await seedReportingTenant();

    await prisma.deal.createMany({
      data: [
        {
          organizationId: organization.id,
          stageId: leadStage.id,
          title: "Open A",
          value: 1000,
          partnerCreatorId: partnerCreator.id,
          status: DealStatus.OPEN,
        },
        {
          organizationId: organization.id,
          stageId: leadStage.id,
          title: "Open B",
          value: 2000,
          partnerCreatorId: partnerCreator.id,
          status: DealStatus.OPEN,
        },
        {
          organizationId: organization.id,
          stageId: wonStage.id,
          title: "Closed win",
          value: 5000,
          partnerCreatorId: partnerCreator.id,
          status: DealStatus.WON,
          closedAt: new Date(),
        },
        {
          organizationId: organization.id,
          stageId: lostStage.id,
          title: "Closed loss",
          value: 800,
          partnerCreatorId: partnerCreator.id,
          status: DealStatus.LOST,
          closedAt: new Date(),
        },
      ],
    });

    const response = await request(testApp)
      .get("/api/crm/reports/pipeline")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(200);
    const { stages, totals } = response.body.data;
    expect(stages.map((stage: { sortOrder: number }) => stage.sortOrder)).toEqual([0, 1, 2, 3, 4]);

    const leadRow = stages.find((stage: { stageId: string }) => stage.stageId === leadStage.id);
    expect(leadRow.openDealCount).toBe(2);
    expect(leadRow.openValue).toBe(3000);

    expect(totals.openValue).toBe(3000);
    expect(totals.wonValue).toBe(5000);
    expect(totals.wonDealCount).toBe(1);
    expect(totals.lostDealCount).toBe(1);
  });

  it("returns every stage at zero when the pipeline has no deals", async () => {
    const { organization, owner } = await seedReportingTenant();

    const response = await request(testApp)
      .get("/api/crm/reports/pipeline")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(200);
    expect(response.body.data.stages).toHaveLength(5);
    expect(response.body.data.totals).toEqual({
      openDealCount: 0,
      openValue: 0,
      wonDealCount: 0,
      wonValue: 0,
      lostDealCount: 0,
    });
  });

  it("denies a member without reports:read", async () => {
    const { organization } = await seedReportingTenant();
    const memberRole = await crmAccessRepository.createRole({
      organizationId: organization.id,
      name: "No reports",
      permissionKeys: ["org:read", "deals:read"],
    });
    const teammate = await createStaff("No Reports Member");
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: teammate.id,
        roleId: memberRole.id,
        status: "ACTIVE",
      },
    });

    const response = await request(testApp)
      .get("/api/crm/reports/pipeline")
      .set("Authorization", authHeaderFor(teammate.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(403);
  });
});

describe("GET /api/crm/reports/tickets", () => {
  it("breaks tickets down by status and computes the mean resolution time in SQL", async () => {
    const { organization, owner } = await seedReportingTenant();
    const shopper = await prisma.user.create({
      data: {
        email: `shopper-${randomUUID()}@outfiqe.test`,
        name: "Report Shopper",
        handle: `shopper-${randomUUID().slice(0, 8)}`,
        phone: uniquePhone(),
        passwordHash: "x",
        role: UserRole.CUSTOMER,
      },
    });

    const createdAt = subHours(new Date(), 5);
    await prisma.crmTicket.createMany({
      data: [
        {
          organizationId: organization.id,
          type: CrmTicketType.COMPLAINT,
          status: CrmTicketStatus.OPEN,
          title: "Open one",
          description: "x",
          customerUserId: shopper.id,
        },
        {
          organizationId: organization.id,
          type: CrmTicketType.REQUEST,
          status: CrmTicketStatus.OPEN,
          title: "Open two",
          description: "x",
          customerUserId: shopper.id,
        },
        {
          organizationId: organization.id,
          type: CrmTicketType.COMPLAINT,
          status: CrmTicketStatus.IN_PROGRESS,
          title: "Working",
          description: "x",
          customerUserId: shopper.id,
        },
        {
          organizationId: organization.id,
          type: CrmTicketType.COMPLAINT,
          status: CrmTicketStatus.RESOLVED,
          title: "Done",
          description: "x",
          customerUserId: shopper.id,
          createdAt,
          resolvedAt: addHours(createdAt, 2),
        },
      ],
    });

    const response = await request(testApp)
      .get("/api/crm/reports/tickets")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(200);
    const { statusCounts, openCount, resolvedCount, meanResolutionSeconds } = response.body.data;
    const asMap = Object.fromEntries(
      statusCounts.map((row: { status: string; count: number }) => [row.status, row.count]),
    );
    expect(asMap.OPEN).toBe(2);
    expect(asMap.IN_PROGRESS).toBe(1);
    expect(asMap.RESOLVED).toBe(1);
    expect(openCount).toBe(3);
    expect(resolvedCount).toBe(1);
    expect(Math.round(meanResolutionSeconds)).toBe(2 * 60 * 60);
  });

  it("returns a null mean and empty breakdown when there are no tickets", async () => {
    const { organization, owner } = await seedReportingTenant();

    const response = await request(testApp)
      .get("/api/crm/reports/tickets")
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(200);
    expect(response.body.data.statusCounts).toEqual([]);
    expect(response.body.data.resolvedCount).toBe(0);
    expect(response.body.data.meanResolutionSeconds).toBeNull();
  });
});

describe("GET /api/crm/search", () => {
  const seedSearchable = async () => {
    const tenant = await seedReportingTenant();
    await prisma.deal.create({
      data: {
        organizationId: tenant.organization.id,
        stageId: tenant.leadStage.id,
        title: "Spring collab launch",
        value: 4000,
        partnerCreatorId: tenant.partnerCreator.id,
        status: DealStatus.OPEN,
      },
    });
    const shopper = await prisma.user.create({
      data: {
        email: `s-${randomUUID()}@outfiqe.test`,
        name: "Search Shopper",
        handle: `s-${randomUUID().slice(0, 8)}`,
        phone: uniquePhone(),
        passwordHash: "x",
        role: UserRole.CUSTOMER,
      },
    });
    await prisma.crmTicket.create({
      data: {
        organizationId: tenant.organization.id,
        type: CrmTicketType.COMPLAINT,
        status: CrmTicketStatus.OPEN,
        title: "Spring order damaged",
        description: "x",
        customerUserId: shopper.id,
      },
    });
    return tenant;
  };

  it("returns deals and tickets matching the query for a full-access viewer", async () => {
    const { organization, owner } = await seedSearchable();

    const response = await request(testApp)
      .get("/api/crm/search")
      .query({ q: "spring" })
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(200);
    expect(response.body.data.deals.map((deal: { title: string }) => deal.title)).toContain(
      "Spring collab launch",
    );
    expect(response.body.data.tickets.map((ticket: { title: string }) => ticket.title)).toContain(
      "Spring order damaged",
    );
  });

  it("omits entity groups the caller has no permission to read", async () => {
    const { organization } = await seedSearchable();
    const limitedRole = await crmAccessRepository.createRole({
      organizationId: organization.id,
      name: "Support only",
      permissionKeys: ["org:read", "tickets:read"],
    });
    const supportAgent = await createStaff("Support Only Agent");
    await prisma.membership.create({
      data: {
        organizationId: organization.id,
        userId: supportAgent.id,
        roleId: limitedRole.id,
        status: "ACTIVE",
      },
    });

    const response = await request(testApp)
      .get("/api/crm/search")
      .query({ q: "spring" })
      .set("Authorization", authHeaderFor(supportAgent.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(200);
    expect(response.body.data.tickets.length).toBeGreaterThan(0);
    expect(response.body.data.deals).toEqual([]);
    expect(response.body.data.partners).toEqual([]);
    expect(response.body.data.customers).toEqual([]);
  });

  it("never leaks another tenant's rows", async () => {
    await seedSearchable();
    const second = await seedReportingTenant();

    const response = await request(testApp)
      .get("/api/crm/search")
      .query({ q: "spring" })
      .set("Authorization", authHeaderFor(second.owner.id))
      .set("Host", host(second.organization.subdomain));

    expect(response.status).toBe(200);
    expect(response.body.data.deals).toEqual([]);
    expect(response.body.data.tickets).toEqual([]);
  });

  it("rejects a query shorter than the minimum length", async () => {
    const { organization, owner } = await seedSearchable();

    const response = await request(testApp)
      .get("/api/crm/search")
      .query({ q: "a" })
      .set("Authorization", authHeaderFor(owner.id))
      .set("Host", host(organization.subdomain));

    expect(response.status).toBe(422);
  });
});
