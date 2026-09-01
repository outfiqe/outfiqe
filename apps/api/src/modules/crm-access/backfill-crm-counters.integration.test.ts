import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";

import { backfillCrmCounters } from "../../../prisma/backfill-crm-counters.js";

const seedCountedTenant = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Counter Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.test`,
      phone: `98${randomUUID().replace(/\D/g, "0").slice(0, 8)}`,
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const { organization } = await seedTenantOrganization({ linkedBrandId: brand.id });
  const stage = await prisma.pipelineStage.create({
    data: { organizationId: organization.id, name: "Lead", sortOrder: 0 },
  });
  const partner = await prisma.user.create({
    data: {
      email: `partner-${randomUUID()}@outfiqe.test`,
      name: "Partner",
      handle: `partner-${randomUUID().slice(0, 8)}`,
      passwordHash: "x",
    },
  });
  return { organization, stage, partner };
};

describe("backfillCrmCounters", () => {
  it("recomputes every counter and the last-activity timestamp from the tenant's rows", async () => {
    const { organization, stage, partner } = await seedCountedTenant();

    await prisma.contact.createMany({
      data: [
        { organizationId: organization.id, name: "C1" },
        { organizationId: organization.id, name: "C2" },
      ],
    });
    await prisma.deal.create({
      data: {
        organizationId: organization.id,
        stageId: stage.id,
        title: "D1",
        partnerCreatorId: partner.id,
      },
    });
    await prisma.crmTicket.create({
      data: {
        organizationId: organization.id,
        type: "COMPLAINT",
        title: "T1",
        description: "x",
        customerUserId: partner.id,
      },
    });
    const activity = await prisma.crmActivity.create({
      data: { organizationId: organization.id, type: "NOTE", body: "hello" },
    });

    const updated = await backfillCrmCounters();
    expect(updated).toBeGreaterThanOrEqual(1);

    const row = await prisma.organization.findUniqueOrThrow({ where: { id: organization.id } });
    expect(row).toMatchObject({
      contactCount: 2,
      dealCount: 1,
      ticketCount: 1,
      activityCount: 1,
    });
    expect(row.lastCrmActivityAt?.getTime()).toBe(activity.occurredAt.getTime());
  });

  it("zeroes the counters for an organization with no CRM rows", async () => {
    const { organization } = await seedCountedTenant();

    await prisma.organization.update({
      where: { id: organization.id },
      data: { contactCount: 99, dealCount: 99, ticketCount: 99, activityCount: 99 },
    });

    await backfillCrmCounters();

    const row = await prisma.organization.findUniqueOrThrow({ where: { id: organization.id } });
    expect(row).toMatchObject({
      contactCount: 0,
      dealCount: 0,
      ticketCount: 0,
      activityCount: 0,
      lastCrmActivityAt: null,
    });
  });
});
