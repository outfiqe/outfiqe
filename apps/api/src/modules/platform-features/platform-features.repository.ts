import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";

import type { SetOverrideInput, TenantFeatureOverrideRecord } from "./platform-features.types.js";

const toRecord = (row: {
  key: string;
  enabled: boolean;
  metadata: unknown;
  note: string | null;
  setByUserId: string | null;
  updatedAt: Date;
}): TenantFeatureOverrideRecord => ({
  key: row.key,
  enabled: row.enabled,
  metadata: (row.metadata ?? {}) as Record<string, unknown>,
  note: row.note,
  setByUserId: row.setByUserId,
  updatedAt: row.updatedAt,
});

export const platformFeaturesRepository = {
  async findOrganizationPlan(organizationId: string): Promise<string | null> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { plan: true },
    });
    return org?.plan ?? null;
  },

  async findOverride(
    organizationId: string,
    key: string,
  ): Promise<TenantFeatureOverrideRecord | null> {
    const row = await prisma.tenantFeatureOverride.findUnique({
      where: { organizationId_key: { organizationId, key } },
      select: {
        key: true,
        enabled: true,
        metadata: true,
        note: true,
        setByUserId: true,
        updatedAt: true,
      },
    });
    return row ? toRecord(row) : null;
  },

  async listOverrides(organizationId: string): Promise<TenantFeatureOverrideRecord[]> {
    const rows = await prisma.tenantFeatureOverride.findMany({
      where: { organizationId },
      select: {
        key: true,
        enabled: true,
        metadata: true,
        note: true,
        setByUserId: true,
        updatedAt: true,
      },
    });
    return rows.map(toRecord);
  },

  async upsertOverride(input: SetOverrideInput): Promise<TenantFeatureOverrideRecord> {
    const data = {
      enabled: input.enabled,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      note: input.note ?? null,
      setByUserId: input.setByUserId ?? null,
    };
    const row = await prisma.tenantFeatureOverride.upsert({
      where: { organizationId_key: { organizationId: input.organizationId, key: input.key } },
      create: { organizationId: input.organizationId, key: input.key, ...data },
      update: data,
      select: {
        key: true,
        enabled: true,
        metadata: true,
        note: true,
        setByUserId: true,
        updatedAt: true,
      },
    });
    return toRecord(row);
  },

  async deleteOverride(organizationId: string, key: string): Promise<boolean> {
    const result = await prisma.tenantFeatureOverride.deleteMany({
      where: { organizationId, key },
    });
    return result.count > 0;
  },
};
