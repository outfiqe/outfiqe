import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { DEFAULT_PIPELINE_STAGES } from "./crm-pipeline.constants.js";

const authHeaderFor = (userId: string) => {
  const { accessToken } = generateTokenpair({ sub: userId, role: UserRole.ADMIN });
  return `Bearer ${accessToken}`;
};

const createUser = (name: string, role: UserRole) =>
  prisma.user.create({
    data: {
      email: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID()}@outfiqe.test`,
      name,
      handle: `${name.toLowerCase().replace(/\s+/g, "-")}-${randomUUID().slice(0, 8)}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });

const seedPipelineTenant = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Pipeline Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: { brandId: brand.id, name: "Tee", price: 1500, type: "TOPS", status: "APPROVED" },
  });

  const { organization, adminRole } = await seedTenantOrganization({ linkedBrandId: brand.id });
  await prisma.pipelineStage.createMany({
    data: DEFAULT_PIPELINE_STAGES.map((stage) => ({
      organizationId: organization.id,
      name: stage.name,
      sortOrder: stage.sortOrder,
      isWon: stage.isWon,
      isLost: stage.isLost,
    })),
  });

  const staff = await createUser("Pipeline Staff", UserRole.ADMIN);
  const membership = await prisma.membership.create({
    data: {
      organizationId: organization.id,
      userId: staff.id,
      roleId: adminRole.id,
      status: "ACTIVE",
    },
  });
  await prisma.organization.update({
    where: { id: organization.id },
    data: { superAdminMembershipId: membership.id, trialEndsAt: addDays(new Date(), 10) },
  });

  const partner = await createUser("Partner Creator", UserRole.CUSTOMER);
  await prisma.creatorLink.create({
    data: {
      creatorId: partner.id,
      productId: product.id,
      token: randomUUID(),
      type: "EXTERNAL_REUSABLE",
    },
  });

  return {
    organization,
    staff,
    membership,
    partner,
    host: `${organization.subdomain}.localhost`,
    auth: authHeaderFor(staff.id),
  };
};

describe("CRM pipeline stages", () => {
  it("exposes the seeded default stages in order", async () => {
    const tenant = await seedPipelineTenant();

    const response = await request(testApp)
      .get("/api/crm/pipeline/stages")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);

    expect(response.status).toBe(200);
    expect(response.body.data.map((s: { name: string }) => s.name)).toEqual([
      "Lead",
      "Contacted",
      "Negotiating",
      "Won",
      "Lost",
    ]);
  });

  it("creates, rejects a duplicate name, and reorders stages atomically", async () => {
    const tenant = await seedPipelineTenant();

    const created = await request(testApp)
      .post("/api/crm/pipeline/stages")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ name: "Proposal Sent" });
    expect(created.status).toBe(201);

    const duplicate = await request(testApp)
      .post("/api/crm/pipeline/stages")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ name: "Lead" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe("STAGE_NAME_TAKEN");

    const stages = await prisma.pipelineStage.findMany({
      where: { organizationId: tenant.organization.id },
      orderBy: { sortOrder: "asc" },
    });
    const reversed = [...stages].reverse().map((stage) => stage.id);

    const reorder = await request(testApp)
      .post("/api/crm/pipeline/stages/reorder")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ orderedStageIds: reversed });
    expect(reorder.status).toBe(200);

    const afterReorder = await prisma.pipelineStage.findMany({
      where: { organizationId: tenant.organization.id },
      orderBy: { sortOrder: "asc" },
    });
    expect(afterReorder.map((stage) => stage.id)).toEqual(reversed);
  });

  it("rejects a partial reorder and a stage that is both won and lost", async () => {
    const tenant = await seedPipelineTenant();
    const firstStage = await prisma.pipelineStage.findFirstOrThrow({
      where: { organizationId: tenant.organization.id },
    });

    const partial = await request(testApp)
      .post("/api/crm/pipeline/stages/reorder")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ orderedStageIds: [firstStage.id] });
    expect(partial.status).toBe(400);

    const conflict = await request(testApp)
      .post("/api/crm/pipeline/stages")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ name: "Weird", isWon: true, isLost: true });
    expect(conflict.status).toBe(400);
    expect(conflict.body.code).toBe("STAGE_OUTCOME_CONFLICT");
  });

  it("won't delete a stage that still has deals", async () => {
    const tenant = await seedPipelineTenant();
    const firstStage = await prisma.pipelineStage.findFirstOrThrow({
      where: { organizationId: tenant.organization.id },
      orderBy: { sortOrder: "asc" },
    });

    await request(testApp)
      .post("/api/crm/deals")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ stageId: firstStage.id, title: "Holding deal", partnerCreatorId: tenant.partner.id });

    const response = await request(testApp)
      .delete(`/api/crm/pipeline/stages/${firstStage.id}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);

    expect(response.status).toBe(409);
    expect(response.body.code).toBe("STAGE_NOT_EMPTY");
  });
});

describe("CRM deals", () => {
  it("opens a deal against a partner and closes it when moved to the Won stage", async () => {
    const tenant = await seedPipelineTenant();
    const stages = await prisma.pipelineStage.findMany({
      where: { organizationId: tenant.organization.id },
      orderBy: { sortOrder: "asc" },
    });
    const [leadStage] = stages;
    if (!leadStage) throw new Error("pipeline stages were not seeded");
    const wonStage = stages.find((stage) => stage.isWon);

    const created = await request(testApp)
      .post("/api/crm/deals")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({
        stageId: leadStage.id,
        title: "Spring collab",
        value: 50000,
        partnerCreatorId: tenant.partner.id,
        ownerMembershipId: tenant.membership.id,
      });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("OPEN");
    expect(created.body.data.partnerName).toBe("Partner Creator");
    expect(created.body.data.ownerName).toBe("Pipeline Staff");

    const moved = await request(testApp)
      .patch(`/api/crm/deals/${created.body.data.id}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ stageId: wonStage?.id });
    expect(moved.status).toBe(200);
    expect(moved.body.data.status).toBe("WON");
    expect(moved.body.data.closedAt).not.toBeNull();
  });

  it("rejects a deal against a creator who is not a partner of this brand", async () => {
    const tenant = await seedPipelineTenant();
    const firstStage = await prisma.pipelineStage.findFirstOrThrow({
      where: { organizationId: tenant.organization.id },
    });
    const stranger = await createUser("Random Creator", UserRole.CUSTOMER);

    const response = await request(testApp)
      .post("/api/crm/deals")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ stageId: firstStage.id, title: "Bad deal", partnerCreatorId: stranger.id });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("NOT_A_PARTNER");
  });

  it("keeps deals isolated between tenants", async () => {
    const tenantA = await seedPipelineTenant();
    const tenantB = await seedPipelineTenant();
    const firstStageA = await prisma.pipelineStage.findFirstOrThrow({
      where: { organizationId: tenantA.organization.id },
    });

    const created = await request(testApp)
      .post("/api/crm/deals")
      .set("Host", tenantA.host)
      .set("Authorization", tenantA.auth)
      .send({ stageId: firstStageA.id, title: "A deal", partnerCreatorId: tenantA.partner.id });

    const crossTenant = await request(testApp)
      .patch(`/api/crm/deals/${created.body.data.id}`)
      .set("Host", tenantB.host)
      .set("Authorization", tenantB.auth)
      .send({ title: "hijacked" });

    expect(crossTenant.status).toBe(404);

    const listB = await request(testApp)
      .get("/api/crm/deals")
      .set("Host", tenantB.host)
      .set("Authorization", tenantB.auth);
    expect(listB.body.data).toEqual([]);
  });
});
