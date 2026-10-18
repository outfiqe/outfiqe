import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import type {
  DeliveryFailureReason,
  PartnerWebhookVerification,
  TrackingEventCode,
} from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

export const partnerWithSetup = {
  accounts: {
    orderBy: { createdAt: "asc" },
    include: { hub: { select: { name: true } } },
  },
  zones: {
    orderBy: [{ hubId: "asc" }, { priority: "asc" }],
    include: { deliveryZone: { select: { name: true } } },
  },
  statusMappings: { orderBy: { rawStatus: "asc" } },
} satisfies Prisma.DeliveryPartnerInclude;

export type PartnerRecord = Prisma.DeliveryPartnerGetPayload<{ include: typeof partnerWithSetup }>;

export type PartnerWriteFields = {
  code: string;
  name: string;
  countryCode: string;
  adapterKey: string;
  isActive: boolean;
  supportsBooking: boolean;
  supportsWebhooks: boolean;
  supportsPolling: boolean;
  supportsCod: boolean;
  supportsCodAmountUpdate: boolean;
  supportsCancel: boolean;
  webhookVerification: PartnerWebhookVerification;
  referencePattern: string | null;
  codRemittanceDays: number;
  trackingUrlTemplate: string | null;
};

type PartnerAccountWriteFields = {
  merchantAccountRef: string;
  pickupPointRef: string | null;
  credentialsKey: string | null;
  isActive: boolean;
};

type PartnerZoneWriteFields = { deliveryZoneId: string; priority: number; isActive: boolean };

type PartnerStatusMappingFields = {
  rawStatus: string;
  canonicalCode: TrackingEventCode;
  reasonCode: DeliveryFailureReason | null;
};

export const logisticsPartnerRepository = {
  async listPartners(): Promise<PartnerRecord[]> {
    return prisma.deliveryPartner.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: partnerWithSetup,
    });
  },

  async findPartnerById(partnerId: string, client: DbClient = prisma) {
    return client.deliveryPartner.findUnique({
      where: { id: partnerId },
      include: partnerWithSetup,
    });
  },

  async createPartner(fields: PartnerWriteFields): Promise<PartnerRecord> {
    return prisma.deliveryPartner.create({ data: fields, include: partnerWithSetup });
  },

  async updatePartner(partnerId: string, fields: PartnerWriteFields): Promise<PartnerRecord> {
    return prisma.deliveryPartner.update({
      where: { id: partnerId },
      data: fields,
      include: partnerWithSetup,
    });
  },

  async upsertPartnerAccount(
    partnerId: string,
    hubId: string,
    fields: PartnerAccountWriteFields,
  ): Promise<void> {
    await prisma.deliveryPartnerAccount.upsert({
      where: { partnerId_hubId: { partnerId, hubId } },
      create: { partnerId, hubId, ...fields },
      update: fields,
    });
  },

  async replacePartnerZonesForHub(
    client: DbClient,
    params: { partnerId: string; hubId: string; zones: readonly PartnerZoneWriteFields[] },
  ): Promise<void> {
    const { partnerId, hubId, zones } = params;
    await client.deliveryPartnerZone.deleteMany({ where: { partnerId, hubId } });
    await client.deliveryPartnerZone.createMany({
      data: zones.map((zone) => ({ partnerId, hubId, ...zone })),
    });
  },

  async replacePartnerStatusMap(
    client: DbClient,
    partnerId: string,
    mappings: readonly PartnerStatusMappingFields[],
  ): Promise<void> {
    await client.deliveryPartnerStatusMap.deleteMany({ where: { partnerId } });
    await client.deliveryPartnerStatusMap.createMany({
      data: mappings.map((mapping) => ({ partnerId, ...mapping })),
    });
  },

  async findStatusMapping(client: DbClient, partnerId: string, rawStatus: string) {
    return client.deliveryPartnerStatusMap.findUnique({
      where: { partnerId_rawStatus: { partnerId, rawStatus } },
      select: { canonicalCode: true, reasonCode: true },
    });
  },
};
