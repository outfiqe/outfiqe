import { randomUUID } from "node:crypto";

import { addDays } from "date-fns/addDays";
import { subDays } from "date-fns/subDays";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { seedTenantOrganization } from "#test/integration/crm-fixtures.js";
import { ensureProductType } from "#test/integration/product-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

import { DEFAULT_PIPELINE_STAGES, MAX_BOARD_DEALS_PER_STAGE } from "./crm-pipeline.constants.js";

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
    data: {
      brandId: brand.id,
      name: "Tee",
      price: 1500,
      productTypeId: await ensureProductType(),
      status: "APPROVED",
    },
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

  const partner = await createUser("Partner Muse", UserRole.CUSTOMER);
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
    expect(created.body.data.partnerName).toBe("Partner Muse");
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

  it("rejects a deal against a muse who is not a partner of this brand", async () => {
    const tenant = await seedPipelineTenant();
    const firstStage = await prisma.pipelineStage.findFirstOrThrow({
      where: { organizationId: tenant.organization.id },
    });
    const stranger = await createUser("Random Muse", UserRole.CUSTOMER);

    const response = await request(testApp)
      .post("/api/crm/deals")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ stageId: firstStage.id, title: "Bad deal", partnerCreatorId: stranger.id });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe("NOT_A_PARTNER");
  });

  it("restarts the time in stage only when the stage really changes", async () => {
    const tenant = await seedPipelineTenant();
    const [firstStage, secondStage] = await prisma.pipelineStage.findMany({
      where: { organizationId: tenant.organization.id },
      orderBy: { sortOrder: "asc" },
    });
    const created = await request(testApp)
      .post("/api/crm/deals")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ stageId: firstStage?.id, title: "A deal", partnerCreatorId: tenant.partner.id });
    const dealId: string = created.body.data.id;
    const startOfLastWeek = subDays(new Date(), 7);
    await prisma.deal.update({ where: { id: dealId }, data: { stageEnteredAt: startOfLastWeek } });

    const sameStage = await request(testApp)
      .patch(`/api/crm/deals/${dealId}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ stageId: firstStage?.id, title: "Renamed" });
    expect(new Date(sameStage.body.data.stageEnteredAt)).toEqual(startOfLastWeek);

    const nextStage = await request(testApp)
      .patch(`/api/crm/deals/${dealId}`)
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ stageId: secondStage?.id });
    expect(new Date(nextStage.body.data.stageEnteredAt).getTime()).toBeGreaterThan(
      startOfLastWeek.getTime(),
    );
  });

  it("exports only this tenant's opportunities, without muse details", async () => {
    const tenant = await seedPipelineTenant();
    const other = await seedPipelineTenant();
    for (const seededTenant of [tenant, other]) {
      const stage = await prisma.pipelineStage.findFirstOrThrow({
        where: { organizationId: seededTenant.organization.id },
      });
      await request(testApp)
        .post("/api/crm/deals")
        .set("Host", seededTenant.host)
        .set("Authorization", seededTenant.auth)
        .send({
          stageId: stage.id,
          title: seededTenant === tenant ? "=Our deal" : "Their deal",
          partnerCreatorId: seededTenant.partner.id,
        });
    }

    const exported = await request(testApp)
      .get("/api/crm/deals/export")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);

    expect(exported.status).toBe(200);
    expect(exported.headers["content-type"]).toContain("text/csv");
    expect(exported.text).toContain("'=Our deal");
    expect(exported.text).not.toContain("Their deal");
    expect(exported.text).not.toContain(tenant.partner.name);
  });

  it("filters the board to open opportunities stuck in their stage", async () => {
    const tenant = await seedPipelineTenant();
    const stage = await prisma.pipelineStage.findFirstOrThrow({
      where: { organizationId: tenant.organization.id },
    });
    const addDeal = (title: string, stageEnteredAt: Date, status: "OPEN" | "WON") =>
      prisma.deal.create({
        data: {
          organizationId: tenant.organization.id,
          stageId: stage.id,
          partnerCreatorId: tenant.partner.id,
          title,
          stageEnteredAt,
          status,
        },
      });
    await addDeal("Stuck", subDays(new Date(), 20), "OPEN");
    await addDeal("Fresh", new Date(), "OPEN");
    await addDeal("Won long ago", subDays(new Date(), 20), "WON");

    const filtered = await request(testApp)
      .get("/api/crm/deals")
      .query({ stageEnteredBefore: subDays(new Date(), 14).toISOString() })
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);

    expect(filtered.body.data.map(({ title }: { title: string }) => title)).toEqual(["Stuck"]);
  });

  it("loads only each column's latest opportunities, but exports them all", async () => {
    const tenant = await seedPipelineTenant();
    const [busyStage, quietStage] = await prisma.pipelineStage.findMany({
      where: { organizationId: tenant.organization.id },
      orderBy: { sortOrder: "asc" },
    });
    if (!busyStage || !quietStage) throw new Error("default pipeline stages were not seeded");
    const dealFor = (stageId: string, title: string, createdAt: Date) => ({
      organizationId: tenant.organization.id,
      stageId,
      partnerCreatorId: tenant.partner.id,
      title,
      createdAt,
    });
    await prisma.deal.createMany({
      data: [
        dealFor(busyStage.id, "Oldest", subDays(new Date(), 30)),
        ...Array.from({ length: MAX_BOARD_DEALS_PER_STAGE }, (_unused, dealIndex) =>
          dealFor(busyStage.id, `Recent ${dealIndex}`, subDays(new Date(), 1)),
        ),
        dealFor(quietStage.id, "Quiet", subDays(new Date(), 60)),
      ],
    });

    const board = await request(testApp)
      .get("/api/crm/deals")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    const boardTitles: string[] = board.body.data.map(({ title }: { title: string }) => title);

    expect(boardTitles).toHaveLength(MAX_BOARD_DEALS_PER_STAGE + 1);
    expect(boardTitles).toContain("Quiet");
    expect(boardTitles).not.toContain("Oldest");

    const exported = await request(testApp)
      .get("/api/crm/deals/export")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);
    expect(exported.text).toContain("Oldest");
  });

  it("filters the board by owner", async () => {
    const tenant = await seedPipelineTenant();
    const stage = await prisma.pipelineStage.findFirstOrThrow({
      where: { organizationId: tenant.organization.id },
    });
    await request(testApp)
      .post("/api/crm/deals")
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth)
      .send({ stageId: stage.id, title: "Unowned", partnerCreatorId: tenant.partner.id });

    const filtered = await request(testApp)
      .get("/api/crm/deals")
      .query({ ownerMembershipId: randomUUID() })
      .set("Host", tenant.host)
      .set("Authorization", tenant.auth);

    expect(filtered.status).toBe(200);
    expect(filtered.body.data).toEqual([]);
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

    const ownDeal = await request(testApp)
      .get(`/api/crm/deals/${created.body.data.id}`)
      .set("Host", tenantA.host)
      .set("Authorization", tenantA.auth);
    expect(ownDeal.status).toBe(200);
    expect(ownDeal.body.data).toMatchObject({
      id: created.body.data.id,
      title: "A deal",
      stageName: firstStageA.name,
    });

    const crossTenantRead = await request(testApp)
      .get(`/api/crm/deals/${created.body.data.id}`)
      .set("Host", tenantB.host)
      .set("Authorization", tenantB.auth);
    expect(crossTenantRead.status).toBe(404);

    const listB = await request(testApp)
      .get("/api/crm/deals")
      .set("Host", tenantB.host)
      .set("Authorization", tenantB.auth);
    expect(listB.body.data).toEqual([]);
  });
});
