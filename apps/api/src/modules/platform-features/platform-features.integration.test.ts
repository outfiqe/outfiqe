import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { seedTenantOrganization } from "#test/integration/crmFixtures.js";

import { platformFeaturesRepository } from "./platform-features.repository.js";
import { platformFeaturesService } from "./platform-features.service.js";

const seedTenant = async (plan: string) => {
  const { organization } = await seedTenantOrganization();
  await prisma.organization.update({ where: { id: organization.id }, data: { plan } });
  return organization.id;
};

describe("platformFeaturesService", () => {
  it("resolves from the plan default when there is no override", async () => {
    const organizationId = await seedTenant("starter");

    const resolved = await platformFeaturesService.resolveFeature(organizationId, "crm.pipeline");
    expect(resolved).toMatchObject({ key: "crm.pipeline", enabled: true, source: "plan" });
  });

  it("an override wins over the plan default", async () => {
    const organizationId = await seedTenant("starter");

    await platformFeaturesRepository.upsertOverride({
      organizationId,
      key: "crm.pipeline",
      enabled: false,
      note: "paused during migration",
    });
    platformFeaturesService.invalidate(organizationId);

    const resolved = await platformFeaturesService.resolveFeature(organizationId, "crm.pipeline");
    expect(resolved).toMatchObject({ enabled: false, source: "override" });
    expect(await platformFeaturesService.isEnabled(organizationId, "crm.pipeline")).toBe(false);
  });

  it("clearing the override reverts to the plan default", async () => {
    const organizationId = await seedTenant("starter");
    await platformFeaturesRepository.upsertOverride({
      organizationId,
      key: "crm.tickets",
      enabled: false,
    });
    platformFeaturesService.invalidate(organizationId);
    expect(await platformFeaturesService.isEnabled(organizationId, "crm.tickets")).toBe(false);

    await platformFeaturesRepository.deleteOverride(organizationId, "crm.tickets");
    platformFeaturesService.invalidate(organizationId);
    const resolved = await platformFeaturesService.resolveFeature(organizationId, "crm.tickets");
    expect(resolved.source).toBe("plan");
  });

  it("falls back to the registry default when the organization is unknown", async () => {
    const resolved = await platformFeaturesService.resolveFeature(randomUUID(), "crm.advanced");
    expect(resolved).toMatchObject({ source: "default", enabled: false });
  });

  it("featureMap returns every registry key", async () => {
    const organizationId = await seedTenant("growth");
    const map = await platformFeaturesService.featureMap(organizationId);
    expect(Object.keys(map).sort()).toEqual(
      [
        "crm.advanced",
        "crm.contacts",
        "crm.pipeline",
        "crm.tickets",
        "impersonation.allowed",
      ].sort(),
    );
  });
});
